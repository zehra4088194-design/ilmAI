import { createAdminClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { extractGoogleDriveFileId } from '@/lib/utils/filePreview';
import type { SubscriptionTier } from '@/types';
import { getR2ObjectStream, getR2Text, parseR2Uri } from '@/lib/storage/r2';

export type ProtectedResourceKind = 'library' | 'past-paper' | 'college-resource' | 'class-library';
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

const PDF_MAGIC_BYTES = '%PDF-';

// Peeks only the first chunk to confirm the PDF signature, then streams the rest straight through
// untouched — same pattern the R2 branch of fetchProtectedFile already used below. This used to
// buffer the ENTIRE file into an in-memory Blob before returning anything (a real chunk was read
// on every loop iteration, accumulated, and only handed back once the whole response had
// finished), which meant Drive-hosted resources (the majority of library_resources, unlike R2)
// never actually streamed progressively — the client's "start reading pages before the whole file
// arrives" experience was blocked here, not just in the browser. Still enforces the same
// 125MB / signature checks, just without holding the whole file in memory first.
function peekAndPassthroughPdf(response: Response, label = 'PDF'): ReadableStream<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`${label} stream is empty.`);

  let totalBytes = 0;
  let firstChunkChecked = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          if (!firstChunkChecked) {
            firstChunkChecked = true;
            const signature = new TextDecoder().decode(value.slice(0, PDF_MAGIC_BYTES.length));
            if (signature !== PDF_MAGIC_BYTES) {
              throw new Error(
                `${label} response is not a PDF file. Check the stored file URL, bucket object, or Drive sharing.`
              );
            }
          }
          totalBytes += value.byteLength;
          if (totalBytes > MAX_PROTECTED_RESOURCE_BYTES) {
            throw new Error('Resource is larger than the 125MB reader limit.');
          }
          controller.enqueue(value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}

export type ProtectedResource = {
  id: string;
  kind: ProtectedResourceKind;
  title: string;
  fileType: string;
  sourceUrl: string;
  contextTextUrl: string | null;
  tier: SubscriptionTier;
  // Only set for kind 'library' — the resource's declared content type
  // ('mcq' | 'short' | 'long' | 'numericals' | 'reading'). Used to keep a
  // strictly-MCQ source file's "test from this file" MCQ-only, instead of
  // trusting the AI content-analyzer's own guess at what "could" be
  // generated from the text.
  contentSection?: string | null;
};

const MAX_PROTECTED_RESOURCE_BYTES = 125 * 1024 * 1024;
const MAX_RESOURCE_CONTEXT_BYTES = 5 * 1024 * 1024;
const MAX_AI_CONTEXT_CHARACTERS = 120_000;
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
  // Class Library is open, platform-wide content — no board/grade/subscription scoping and no
  // profile lookup needed at all (its RLS already "grants SELECT to everyone"), unlike every
  // other kind below. Handled first so it never depends on the signed-in user having a profile row.
  if (kind === 'class-library') return getClassLibraryProtectedResource(resourceId);

  const admin = (await createAdminClient()) as any;
  const pdfAdmin = createServiceClient() as any;
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'subscription_tier, board, grade_level, college_id, university_stream, university_degree, university_semester'
    )
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;

  if (kind === 'library') {
    const { data: resource } = await pdfAdmin
      .from('library_resources')
      .select(
        'id, title, board, grade_level, drive_url, light_file_url, dark_file_url, file_type, context_text_url, content_section'
      )
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
      contentSection: resource.content_section || null,
    };
  }

  if (kind === 'past-paper') {
    const { data: paper } = await pdfAdmin
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

  const { data: resource } = await pdfAdmin
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

// Shared by getProtectedResource (signed-in) and getPublicResource (logged-out) — Class Library
// has exactly one access rule ("anyone"), so both entry points resolve identically.
async function getClassLibraryProtectedResource(resourceId: string): Promise<ProtectedResource | null> {
  const supabase = createServiceClient() as any;
  const { data: resource } = await supabase
    .from('class_library_subject_resources')
    .select('id, resource_type, title, url')
    .eq('id', resourceId)
    .maybeSingle();
  // video_lecture rows are YouTube/embed links, never a document — the reader never requests
  // these (the UI keeps them as a plain external link), but guard here too in case it ever does.
  if (!resource?.url || resource.resource_type === 'video_lecture') return null;
  return {
    id: resource.id,
    kind: 'class-library',
    title: resource.title,
    fileType: 'pdf',
    sourceUrl: resource.url,
    contextTextUrl: null,
    tier: 'FREE',
  };
}

/** Public read-only catalog access. No profile scope, downloads, or college files. */
export async function getPublicResource(
  kind: Extract<ProtectedResourceKind, 'library' | 'past-paper' | 'class-library'>,
  resourceId: string,
  mode: ResourceMode
): Promise<ProtectedResource | null> {
  const pdfAdmin = createServiceClient() as any;
  if (kind === 'class-library') return getClassLibraryProtectedResource(resourceId);
  if (kind === 'library') {
    const { data: resource } = await pdfAdmin
      .from('library_resources')
      .select('id, title, drive_url, light_file_url, dark_file_url, file_type, context_text_url')
      .eq('id', resourceId)
      .maybeSingle();
    if (!resource) return null;
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
      tier: 'FREE',
    };
  }

  const { data: paper } = await pdfAdmin
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
  if (resource.sourceUrl.startsWith('r2://')) {
    const parsed = parseR2Uri(resource.sourceUrl);
    if (!parsed) throw new Error('Invalid stored PDF path.');
    const storedFile = await getR2ObjectStream(parsed.key, undefined, parsed.bucket);
    if (!storedFile) throw new Error('Stored PDF file is missing.');
    if (storedFile.contentLength && storedFile.contentLength > MAX_PROTECTED_RESOURCE_BYTES) {
      throw new Error('Resource is larger than the 125MB reader limit.');
    }
    // Peek only the first chunk to confirm the PDF signature, then stream the rest straight
    // through untouched — this is what lets the reader start receiving pages immediately instead
    // of waiting for the entire file to land on the server first (see getR2ObjectStream).
    const reader = storedFile.body.getReader();
    const { done, value: firstChunk } = await reader.read();
    if (resource.fileType === 'pdf') {
      const signature = new TextDecoder().decode((firstChunk || new Uint8Array()).slice(0, PDF_MAGIC_BYTES.length));
      if (signature !== PDF_MAGIC_BYTES) {
        throw new Error('Stored PDF object is not a PDF file. Check the bucket object key/content.');
      }
    }
    const passthrough = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (firstChunk) controller.enqueue(firstChunk);
        if (done) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            if (next.value) controller.enqueue(next.value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel(reason) {
        void reader.cancel(reason);
      },
    });
    return new Response(passthrough, {
      headers: { 'content-type': storedFile.contentType || 'application/pdf' },
    });
  }

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
    throw new Error(
      'Drive returned an HTML page instead of the file. Make the file public with "Anyone with the link".'
    );
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_PROTECTED_RESOURCE_BYTES) {
    throw new Error('Resource is larger than the 125MB reader limit.');
  }
  if (resource.fileType === 'pdf') {
    // Streams progressively now (see peekAndPassthroughPdf) — the one tradeoff versus the old
    // fully-buffered version is that a bad signature/oversize error surfaces as a mid-stream abort
    // rather than a clean pre-flight error response, since the HTTP response has already started
    // by the time the first chunk is checked. Acceptable: that's an admin content-configuration
    // mistake (wrong file linked), not a normal user-facing path.
    return new Response(peekAndPassthroughPdf(response), {
      headers: { 'content-type': 'application/pdf' },
    });
  }
  return response;
}

async function fetchCompanionContext(resource: ProtectedResource) {
  if (!resource.contextTextUrl) return null;
  if (resource.contextTextUrl.startsWith('r2://')) {
    const parsed = parseR2Uri(resource.contextTextUrl);
    if (!parsed) throw new Error('Invalid R2 context path.');
    const storedText = await getR2Text(parsed.key, parsed.bucket);
    if (!storedText) throw new Error('Stored R2 context file is missing.');
    const text = normalizeContextText(storedText);
    if (text.length < 50) throw new Error('Stored context file has too little readable text.');
    return text;
  }
  if (resource.contextTextUrl.startsWith(STORAGE_CONTEXT_PREFIX)) {
    const path = resource.contextTextUrl.slice(STORAGE_CONTEXT_PREFIX.length);
    if (!path || path.includes('..')) throw new Error('Invalid stored context path.');
    const pdfAdmin = createServiceClient() as any;
    const { data, error } = await pdfAdmin.storage.from(RESOURCE_CONTEXT_BUCKET).download(path);
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
    throw new Error(
      'The context URL returned an HTML page instead of a .txt file. Set Drive sharing to Anyone with the link.'
    );
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

export async function fetchResourceContext(resource: ProtectedResource) {
  if (!resource.contextTextUrl) {
    throw new Error('This resource has no companion .txt file. Attach its extracted text before using AI tools.');
  }

  const companionContext = await fetchCompanionContext(resource);
  if (!companionContext) {
    throw new Error('The companion .txt file could not be read. PDF files are never sent to AI as a fallback.');
  }
  return companionContext;
}

export async function getResourceForProcessing(
  kind: ProtectedResourceKind,
  resourceId: string
): Promise<ProtectedResource | null> {
  // Class Library has no AI-context/background-processing pipeline (no context_text_url column
  // at all) — this function exists for the other three kinds' AI tools queue only.
  if (kind === 'class-library') return null;
  const pdfAdmin = createServiceClient() as any;
  if (kind === 'library') {
    const { data } = await pdfAdmin
      .from('library_resources')
      .select('id, title, drive_url, light_file_url, dark_file_url, file_type, context_text_url')
      .eq('id', resourceId)
      .maybeSingle();
    if (!data) return null;
    const sourceUrl = data.dark_file_url || data.drive_url || data.light_file_url;
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
    const { data } = await pdfAdmin
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
  const { data } = await pdfAdmin
    .from('college_resources')
    .select('id, title, resource_type, file_url, light_file_url, dark_file_url, context_text_url')
    .eq('id', resourceId)
    .maybeSingle();
  if (!data) return null;
  const sourceUrl = data.dark_file_url || data.file_url || data.light_file_url;
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
