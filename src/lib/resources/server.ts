import { createAdminClient } from '@/lib/supabase/server';
import { extractGoogleDriveFileId } from '@/lib/utils/filePreview';
import type { SubscriptionTier } from '@/types';

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
const MAX_AI_CONTEXT_CHARACTERS = 120_000;
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
  if (!action) return null;

  const confirmationUrl = new URL(action, response.url);
  if (!isGoogleDriveDownloadUrl(confirmationUrl.toString())) return null;

  for (const input of html.match(/<input\b[^>]*>/gi) || []) {
    const name = input.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = input.match(/\bvalue=["']([^"']*)["']/i)?.[1];
    if (name && value !== undefined) confirmationUrl.searchParams.set(name, value);
  }

  return confirmationUrl.toString();
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
    if (!confirmationUrl) throw new Error('Google Drive ne file download confirmation maangi hai.');
    response = await fetch(confirmationUrl, requestInit);
    if (!response.ok) throw new Error(`Resource fetch failed (${response.status}).`);
  }

  if (response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new Error('Drive se PDF file ki jagah HTML response mila.');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_PROTECTED_RESOURCE_BYTES) {
    throw new Error('Resource is larger than the 125MB reader limit.');
  }
  return response;
}

export async function fetchResourceContext(resource: ProtectedResource) {
  if (!resource.contextTextUrl) {
    throw new Error('Is PDF ki companion .txt file add nahi hui. Admin se AI Context (.txt) URL add karo.');
  }
  const requestInit: RequestInit = {
    redirect: 'follow',
    cache: 'no-store',
    headers: { 'user-agent': 'ilm-ai-context-reader/1.0', accept: 'text/plain' },
    signal: AbortSignal.timeout(30_000),
  };
  let response = await fetch(safeRemoteUrl(resource.contextTextUrl), requestInit);
  if (!response.ok) throw new Error(`Context file fetch nahi hui (${response.status}).`);

  const initialContentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (initialContentType.includes('text/html') && isGoogleDriveDownloadUrl(response.url)) {
    const confirmationUrl = getGoogleDriveConfirmationUrl(response, await response.text());
    if (!confirmationUrl) throw new Error('Google Drive ne context file ki download confirmation rok di.');
    response = await fetch(confirmationUrl, requestInit);
    if (!response.ok) throw new Error(`Context file fetch nahi hui (${response.status}).`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (contentType.includes('text/html')) {
    throw new Error('Context URL se .txt file ki jagah HTML page mila. Drive sharing ko Anyone with link karo.');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESOURCE_CONTEXT_BYTES) {
    throw new Error('Context .txt file 5MB se bari hai. Isay compact text file mein divide karo.');
  }

  const text = (await response.text())
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .trim();
  if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text)) {
    throw new Error('Context URL se .txt file ki jagah Google Drive HTML page mila.');
  }
  if (text.length < 50) throw new Error('Context .txt file mein readable text bohat kam hai.');
  return text.slice(0, MAX_AI_CONTEXT_CHARACTERS);
}
