import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchProtectedFile,
  getPublicResource,
  getProtectedResource,
  type ProtectedResourceKind,
  type ResourceMode,
} from '@/lib/resources/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESOURCE_KINDS = new Set<ProtectedResourceKind>(['library', 'past-paper', 'college-resource']);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const kind = req.nextUrl.searchParams.get('kind') as ProtectedResourceKind | null;
    const id = req.nextUrl.searchParams.get('id');
    const mode: ResourceMode = req.nextUrl.searchParams.get('mode') === 'dark' ? 'dark' : 'light';
    if (!kind || !RESOURCE_KINDS.has(kind) || !id) {
      return NextResponse.json({ error: 'Invalid resource request.' }, { status: 400 });
    }

    const resource = user
      ? await getProtectedResource(user.id, kind, id, mode)
      : kind === 'library' || kind === 'past-paper'
        ? await getPublicResource(kind, id, mode)
        : null;
    if (!resource) return NextResponse.json({ error: 'The resource is unavailable.' }, { status: 404 });

    const remote = await fetchProtectedFile(resource);
    if (!remote.body) throw new Error('The resource stream is empty.');
    const remoteContentType = remote.headers.get('content-type')?.toLowerCase() || '';
    const contentType =
      resource.fileType.toLowerCase().includes('pdf') &&
      (!remoteContentType || remoteContentType === 'application/octet-stream')
        ? 'application/pdf'
        : remoteContentType || 'application/pdf';
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    });
    const contentLength = remote.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    return new NextResponse(remote.body, { headers });
  } catch (error) {
    console.error('Resource preview failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The resource preview could not be opened.' },
      { status: 500 }
    );
  }
}
