import { createAdminClient } from '@/lib/supabase/server';
import { performOcr } from '@/lib/ocr';
import { getRedisClient } from '@/lib/redis/client';
import { extractGoogleDriveFileId } from '@/lib/utils/filePreview';
import type { SubscriptionTier } from '@/types';
import { getR2Text, getR2Uri, isR2Configured, parseR2Uri, putR2Object } from '@/lib/storage/r2';

export type ProtectedResourceKind = 'library' | 'past-paper' | 'college-resource';
export type ResourceMode = 'light' | 'dark';

type ProfileScope = {
  subscription_tier: SubscriptionTier | null;
  board: string | null;
  grade_level: string | null;
  college_id: string | null;
  university_stream: string | null;
  university_degree: string | null;
  university_semester: string | null;
};

export type ProtectedResource = {
  id: string;
  kind: ProtectedResourceKind;
  title: string;
  fileType: string;
  sourceUrl: string;
  contextTextUrl: string | null;
  tier: SubscriptionTier;
};

const MAX_PROTECTED_RESOURCE_BYTES = 125 * 1024 * 1024;
const MAX_RESOURCE_CONTEXT_BYTES = 5 * 1024 * 1024;
const MAX_RESOURCE_OCR_BYTES = 25 * 1024 * 1024;
const MAX_AI_CONTEXT_CHARACTERS = 120_000;
const RESOURCE_CONTEXT_CACHE_SECONDS = 24 * 60 * 60;
const RESOURCE_CONTEXT_BUCKET = 'resource-context';
const STORAGE_CONTEXT_PREFIX = `storage://${RESOURCE_CONTEXT_BUCKET}/`;
const GOOGLE_DRIVE_DOWNLOAD_HOSTS = new Set(['drive.google.com', 'drive.usercontent.google.com']);

function isVisibleForProfile(resource: { board?: string | null; grade_level?: string | null }, profile: ProfileScope) {
  const boardMatches = !resource.board || resource.board === profile.board;
  const gradeMatches = !resource.grade_level || resource.grade_level === profile.grade_level;
  return boardMatches && gradeMatches;
}

function safeRemoteUrl(url: string) {
  const driveId = extractGoogleDriveFileId(url);
  if (driveId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`;

  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS resource URLs are allowed.');
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error('Private network resource URLs are not allowed.');
  }
  return parsed.toString();
}

function isGoogleDriveDownloadUrl(url: string) {
  try {
    return GOOGLE_DRIVE_DOWNLOAD_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function getGoogleDriveConfirmationUrl(response: Response, html: string) {
  const action = html.match(/<form\b[^>]*\baction=["']([^"']+)["'][^>]*>/i)?.[1];
  const confirmationUrl = action ? new URL(action, response.url) : null;

  if (confirmationUrl && isGoogleDriveDownloadUrl(confirmationUrl.toString())) {
    for (const input of html.match(/<input\b[^>]*>/gi) || []) {
      const name = input.match(/\bname=["']([^"']+)["']/i)?.[1];
      const value = input.match(/\bvalue=["']([^"']*)["']/i)?.[1];
      if (name && value !== undefined) confirmationUrl.searchParams.set(name, value);
    }

    return confirmationUrl.toString();
  }

  for (const hrefMatch of html.matchAll(/\bhref=["']([^"']*(?:uc\?|download\?)[^"']*)["']/gi)) {
    const candidate = new URL(hrefMatch[1]!.replace(/&amp;/g, '&'), response.url);
    if (isGoogleDriveDownloadUrl(candidate.toString())) return candidate.toString();
  }

  return null;
}

export async function getProtectedResource(
  userId: string,
  kind: ProtectedResourceKind,
  resourceId: string,
  mode: ResourceMode
): Promise<ProtectedResource | null> {
  const admin = (await createAdminClient()) as any;
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'subscription_tier, board, grade_level, college_id, university_stream, university_degree, university_semester'
    )
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;

  if (kind === 'library') {
    const { data: resource } = await admin
      .from('library_resources')
      .select('id, title, board, grade_level, drive_url, light_file_url, dark_file_url, file_type, context_text_url')
      .eq('id', resourceId)
      .maybeSingle();
    if (!resource || !isVisibleForProfile(resource, profile)) return null;
    const sourceUrl =
      mode === 'dark'
        ? resource.dark_file_url || resource.light_file_url || resource.drive_url
        : resource.light_file_url || resource.drive_url || resource.dark_file_url;
    if (!sourceUrl) return null;
    return {
      id: resource.id,
      kind,
      title: resource.title,
      fileType: resource.file_type || 'pdf',
      sourceUrl,
      contextTextUrl: resource.context_text_url || null,
      tier: (profile.subscription_tier as SubscriptionTier) || 'FREE',
    };
  }

  if (kind === 'past-paper') {
    const { data: paper } = await admin
      .from('past_papers')
      .select('id, board, grade_level, year, paper_type, file_url, context_text_url, subjects(name)')
      .eq('id', resourceId)
      .maybeSingle();
    if (!paper || !isVisibleForProfile(paper, profile)) return null;
    return {
      id: paper.id,
      kind,
      title: `${paper.subjects?.name || 'Past Paper'} - ${paper.year} ${paper.paper_type}`,
      fileType: 'pdf',
      sourceUrl: paper.file_url,
      contextTextUrl: paper.context_text_url || null,
      tier: (profile.subscription_tier as SubscriptionTier) || 'FREE',
    };
  }

  const { data: resource } = await admin
    .from('college_resources')
    .select(
      'id, college_id, title, resource_type, stream, degree_name, semester, file_url, light_file_url, dark_file_url, context_text_url'
    )
    .eq('id', resourceId)
    .maybeSingle();
  if (!resource || !profile.college_id || resource.college_id !== profile.college_id) return null;
  const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() || '';
  const scopedValues = [
    [profile.university_stream, resource.stream],
    [profile.university_degree, resource.degree_name],
    [profile.university_semester, resource.semester],
  ];
  if (
    scopedValues.some(
      ([studentValue, resourceValue]) =>
        normalize(studentValue) && normalize(resourceValue) && normalize(studentValue) !== normalize(resourceValue)
    )
  ) {
    return null;
  }
  const sourceUrl =
    mode === 'dark'
      ? resource.dark_file_url || resource.light_file_url || resource.file_url
      : resource.light_file_url || resource.file_url || resource.dark_file_url;
  if (!sourceUrl) return null;
  return {
    id: resource.id,
    kind,
    title: resource.title,
    fileType: 'pdf',
    sourceUrl,
    contextTextUrl: resource.context_text_url || null,
    tier: (profile.subscription_tier as SubscriptionTier) || 'FREE',
  };
}

/** Public read-only catalog access. No profile scope, downloads, or college files. */
export async function getPublicResource(
  kind: Extract<ProtectedResourceKind, 'library' | 'past-paper'>,
  resourceId: string,
  mode: ResourceMode
): Promise<ProtectedResource | null> {
  const admin = (await createAdminClient()) as any;
  if (kind === 'library') {
    const { data: resource } = await admin
      .from('library_resources')
      .select('id, title, drive_url, light_file_url, dark_file_url, file_type, context_text_url')
      .eq('id', resourceId)
      .maybeSingle();
    if (!resource) return null;
    const sourceUrl = mode === 'dark'
      ? resource.dark_file_url || resource.light_file_url || resource.drive_url
      : resource.light_file_url || resource.drive_url || resource.dark_file_url;
    if (!sourceUrl) return null;
    return {
      id: resource.id,
      kind,
      title: resource.title,
      fileType: resource.file_type || 'pdf',
      sourceUrl,
      contextTextUrl: resource.context_text_url || null,
      tier: 'FREE',
    };
  }

  const { data: paper } = await admin
    .from('past_papers')
    .select('id, year, paper_type, file_url, context_text_url, subjects(name)')
    .eq('id', resourceId)
    .maybeSingle();
  if (!paper?.file_url) return null;
  return {
    id: paper.id,
    kind,
    title: `${paper.subjects?.name || 'Past Paper'} - ${paper.year} ${paper.paper_type}`,
    fileType: 'pdf',
    sourceUrl: paper.file_url,
    contextTextUrl: paper.context_text_url || null,
    tier: 'FREE',
  };
}

export async function fetchProtectedFile(resource: ProtectedResource) {
  const requestInit: RequestInit = {
    redirect: 'follow',
    cache: 'no-store',
    headers: { 'user-agent': 'ilm-ai-protected-reader/1.0' },
    signal: AbortSignal.timeout(45_000),
  };
  let response = await fetch(safeRemoteUrl(resource.sourceUrl), requestInit);
  if (!response.ok) throw new Error(`Resource fetch failed (${response.status}).`);

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (contentType.includes('text/html') && isGoogleDriveDownloadUrl(response.url)) {
    const confirmationUrl = getGoogleDriveConfirmationUrl(response, await response.text());
    if (!confirmationUrl) throw new Error('Google Drive requires a download confirmation that could not be resolved.');
    response = await fetch(confirmationUrl, requestInit);
    if (!response.ok) throw new Error(`Resource fetch failed (${response.status}).`);
  }

  if (response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new Error('Drive returned an HTML page instead of the file. Make the file public with "Anyone with the link".');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_PROTECTED_RESOURCE_BYTES) {
    throw new Error('Resource is larger than the 125MB reader limit.');
  }
  return response;
}

async function fetchCompanionContext(resource: ProtectedResource) {
  if (!resource.contextTextUrl) return null;
  if (resource.contextTextUrl.startsWith('r2://')) {
    const key = parseR2Uri(resource.contextTextUrl);
    if (!key) throw new Error('Invalid R2 context path.');
    const storedText = await getR2Text(key);
    if (!storedText) throw new Error('Stored R2 context file is missing.');
    const text = normalizeContextText(storedText);
    if (text.length < 50) throw new Error('Stored context file has too little readable text.');
    return text;
  }
  if (resource.contextTextUrl.startsWith(STORAGE_CONTEXT_PREFIX)) {
    const path = resource.contextTextUrl.slice(STORAGE_CONTEXT_PREFIX.length);
    if (!path || path.includes('..')) throw new Error('Invalid stored context path.');
    const admin = (await createAdminClient()) as any;
    const { data, error } = await admin.storage.from(RESOURCE_CONTEXT_BUCKET).download(path);
    if (error || !data) throw new Error(`Stored context file could not be loaded: ${error?.message || 'missing file'}`);
    const text = normalizeContextText(await data.text());
    if (text.length < 50) throw new Error('Stored context file has too little readable text.');
    return text;
  }
  const requestInit: RequestInit = {
    redirect: 'follow',
    cache: 'no-store',
    headers: { 'user-agent': 'ilm-ai-context-reader/1.0', accept: 'text/plain' },
    signal: AbortSignal.timeout(30_000),
  };
  let response = await fetch(safeRemoteUrl(resource.contextTextUrl), requestInit);
  if (!response.ok) throw new Error(`Context file fetch failed (${response.status}).`);

  const initialContentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (initialContentType.includes('text/html') && isGoogleDriveDownloadUrl(response.url)) {
    const confirmationUrl = getGoogleDriveConfirmationUrl(response, await response.text());
    if (!confirmationUrl) throw new Error('Google Drive context download confirmation could not be resolved.');
    response = await fetch(confirmationUrl, requestInit);
    if (!response.ok) throw new Error(`Context file fetch failed (${response.status}).`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (contentType.includes('text/html')) {
    throw new Error('The context URL returned an HTML page instead of a .txt file. Set Drive sharing to Anyone with the link.');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESOURCE_CONTEXT_BYTES) {
    throw new Error('The context .txt file exceeds 5 MB. Split it into smaller text files.');
  }

  const text = (await response.text())
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .trim();
  if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text)) {
    throw new Error('The context URL returned a Google Drive HTML page instead of a .txt file.');
  }
  if (text.length < 50) throw new Error('The context .txt file does not contain enough readable text.');
  return text.slice(0, MAX_AI_CONTEXT_CHARACTERS);
}

function normalizeContextText(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, MAX_AI_CONTEXT_CHARACTERS);
}

async function readCachedOcrContext(cacheKey: string) {
  try {
    const redis = await getRedisClient();
    return redis ? await redis.get(cacheKey) : null;
  } catch (error) {
    console.warn('Resource OCR cache read failed:', error);
    return null;
  }
}

async function cacheOcrContext(cacheKey: string, context: string) {
  try {
    const redis = await getRedisClient();
    if (redis) await redis.set(cacheKey, context, { EX: RESOURCE_CONTEXT_CACHE_SECONDS });
  } catch (error) {
    console.warn('Resource OCR cache write failed:', error);
  }
}

async function persistResourceContext(resource: ProtectedResource, context: string) {
  const admin = (await createAdminClient()) as any;
  const path = `${resource.kind}/${resource.id}.txt`;
  let storageUrl: string | null = null;

  if (isR2Configured()) {
    try {
      const r2Key = `resource-context/${path}`;
      await putR2Object(r2Key, Buffer.from(context, 'utf8'), {
        contentType: 'text/plain; charset=utf-8',
        cacheControl: 'private, max-age=31536000, immutable',
      });
      storageUrl = getR2Uri(r2Key);
    } catch (error) {
      console.warn('R2 context sidecar save failed; using Supabase Storage:', error);
    }
  }

  if (!storageUrl) {
    const { error: uploadError } = await admin.storage
      .from(RESOURCE_CONTEXT_BUCKET)
      .upload(path, Buffer.from(context, 'utf8'), {
        contentType: 'text/plain; charset=utf-8',
        cacheControl: '31536000',
        upsert: true,
      });
    if (uploadError) throw new Error(`Context sidecar could not be saved: ${uploadError.message}`);
    storageUrl = `${STORAGE_CONTEXT_PREFIX}${path}`;
  }

  const table =
    resource.kind === 'library'
      ? 'library_resources'
      : resource.kind === 'past-paper'
        ? 'past_papers'
        : 'college_resources';
  const { error: updateError } = await admin.from(table).update({ context_text_url: storageUrl }).eq('id', resource.id);
  if (updateError) throw new Error(`Resource context reference could not be updated: ${updateError.message}`);
  resource.contextTextUrl = storageUrl;
}

export async function fetchResourceContext(resource: ProtectedResource) {
  if (resource.contextTextUrl) {
    try {
      const companionContext = await fetchCompanionContext(resource);
      if (companionContext) return companionContext;
    } catch (error) {
      console.warn(`Companion context failed for ${resource.kind}/${resource.id}; trying protected OCR:`, error);
    }
  }

  const cacheKey = `resource-context:v1:${resource.kind}:${resource.id}`;
  const cachedContext = await readCachedOcrContext(cacheKey);
  if (cachedContext && cachedContext.length >= 50) return cachedContext.slice(0, MAX_AI_CONTEXT_CHARACTERS);

  const response = await fetchProtectedFile(resource);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESOURCE_OCR_BYTES) {
    throw new Error('For AI summaries or tests, use a PDF smaller than 25 MB or add a companion .txt file.');
  }
  const fileBuffer = Buffer.from(await response.arrayBuffer());
  if (fileBuffer.length > MAX_RESOURCE_OCR_BYTES) {
    throw new Error('For AI summaries or tests, use a PDF smaller than 25 MB or add a companion .txt file.');
  }

  const responseMime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  const mimeType =
    responseMime === 'application/pdf' || resource.fileType.toLowerCase().includes('pdf')
      ? 'application/pdf'
      : responseMime || 'application/octet-stream';
  const ocrResult = await performOcr({
    imageBuffer: fileBuffer,
    mimeType,
    userTier: resource.tier,
    mode: 'printed',
    timeoutMs: 180_000,
  });
  const context = normalizeContextText(ocrResult.text);
  if (context.length < 50) {
    throw new Error('No readable text could be extracted for the AI summary or test. Add a companion .txt file.');
  }
  await persistResourceContext(resource, context);
  await cacheOcrContext(cacheKey, context);
  return context;
}

export async function getResourceForProcessing(
  kind: ProtectedResourceKind,
  resourceId: string
): Promise<ProtectedResource | null> {
  const admin = (await createAdminClient()) as any;
  if (kind === 'library') {
    const { data } = await admin
      .from('library_resources')
      .select('id, title, drive_url, light_file_url, dark_file_url, file_type, context_text_url')
      .eq('id', resourceId)
      .maybeSingle();
    if (!data) return null;
    const sourceUrl = data.light_file_url || data.drive_url || data.dark_file_url;
    if (!sourceUrl) return null;
    return {
      id: data.id,
      kind,
      title: data.title,
      fileType: data.file_type || 'pdf',
      sourceUrl,
      contextTextUrl: data.context_text_url || null,
      tier: 'PRO',
    };
  }
  if (kind === 'past-paper') {
    const { data } = await admin
      .from('past_papers')
      .select('id, year, paper_type, file_url, context_text_url, subjects(name)')
      .eq('id', resourceId)
      .maybeSingle();
    if (!data?.file_url) return null;
    return {
      id: data.id,
      kind,
      title: `${data.subjects?.name || 'Past Paper'} - ${data.year} ${data.paper_type}`,
      fileType: 'pdf',
      sourceUrl: data.file_url,
      contextTextUrl: data.context_text_url || null,
      tier: 'PRO',
    };
  }
  const { data } = await admin
    .from('college_resources')
    .select('id, title, resource_type, file_url, light_file_url, dark_file_url, context_text_url')
    .eq('id', resourceId)
    .maybeSingle();
  if (!data) return null;
  const sourceUrl = data.light_file_url || data.file_url || data.dark_file_url;
  if (!sourceUrl) return null;
  return {
    id: data.id,
    kind,
    title: data.title,
    fileType: data.resource_type || 'pdf',
    sourceUrl,
    contextTextUrl: data.context_text_url || null,
    tier: 'PRO',
  };
}
