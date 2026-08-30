import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';
import {
  fetchProtectedFile,
  getPublicResource,
  getProtectedResource,
  type ProtectedResourceKind,
  type ResourceMode,
} from '@/lib/resources/server';

export const runtime = 'nodejs';
// Matches getR2ObjectStream's 90s fetch timeout with headroom — streaming the response through
// (rather than buffering the whole file before replying) means this duration only has to cover
// one file's worth of B2 transfer time now, not "B2 download + full re-upload to the client".
export const maxDuration = 100;

// req.nextUrl.origin is unreliable behind a reverse proxy (e.g. Traefik
// terminates TLS and proxies over plain HTTP, so Next sees http:// while the
// browser's real Origin is https://) — use the same x-forwarded-* aware
// resolver the rest of the app uses instead of comparing against it directly.
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return origin === getRequestSiteUrl(req);
}

async function respondWithResource(
  req: NextRequest,
  kindRaw: unknown,
  idRaw: unknown,
  modeRaw: unknown,
  purposeRaw: unknown
) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const kind = kindRaw as ProtectedResourceKind;
  const mode: ResourceMode = modeRaw === 'dark' ? 'dark' : 'light';
  const purpose = purposeRaw === 'offline' ? 'offline' : 'reader';
  if (
    (kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource' && kind !== 'class-library') ||
    typeof idRaw !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid resource request.' }, { status: 400 });
  }

  const resource = user
    ? await getProtectedResource(user.id, kind, idRaw, mode)
    : kind === 'library' || kind === 'past-paper' || kind === 'class-library'
      ? await getPublicResource(kind, idRaw, mode)
      : null;
  if (!resource) return NextResponse.json({ error: 'Resource is not available.' }, { status: 404 });
  if (purpose === 'offline') {
    const settings = await getPlatformSettings();
    if (!getPlanFromSettings(settings, resource.tier).access.downloadPDF) {
      return NextResponse.json({ error: 'Offline save is available on Pro and Elite plans.' }, { status: 403 });
    }
  }

  const remote = await fetchProtectedFile(resource);
  if (!remote.body) throw new Error('Resource stream is empty.');
  const remoteContentType = remote.headers.get('content-type')?.toLowerCase() || '';
  const contentType =
    resource.fileType === 'pdf' && (!remoteContentType || remoteContentType === 'application/octet-stream')
      ? 'application/pdf'
      : remoteContentType || 'application/octet-stream';
  return new NextResponse(remote.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await respondWithResource(req, body.kind, body.id, body.mode, body.purpose);
  } catch (error) {
    console.error('Protected resource stream failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The resource could not be opened.' },
      { status: 502 }
    );
  }
}

// GET, reader purpose only — lets react-pdf/pdf.js fetch this URL directly (Document file={url})
// and stream+render pages as bytes arrive, instead of the client having to await a full .blob()
// first (see ProtectedResourceReader — that used to block on the whole file downloading before
// react-pdf ever saw a single byte, even though the server itself already streamed progressively).
// A GET is required because pdf.js's url mode issues a plain fetch, not a POST+JSON body — but
// this reuses the exact same auth/entitlement path as POST above, just without the offline branch
// (offline save still needs the full file in memory to persist, so it keeps using POST + .blob()).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    return await respondWithResource(
      req,
      searchParams.get('kind'),
      searchParams.get('id'),
      searchParams.get('mode'),
      'reader'
    );
  } catch (error) {
    console.error('Protected resource stream failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The resource could not be opened.' },
      { status: 502 }
    );
  }
}
