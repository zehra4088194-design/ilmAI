import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import {
  fetchProtectedFile,
  getProtectedResource,
  type ProtectedResourceKind,
  type ResourceMode,
} from '@/lib/resources/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return origin === req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required hai.' }, { status: 401 });

    const body = await req.json();
    const kind = body.kind as ProtectedResourceKind;
    const mode: ResourceMode = body.mode === 'dark' ? 'dark' : 'light';
    const purpose = body.purpose === 'offline' ? 'offline' : 'reader';
    if ((kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource') || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Invalid resource request.' }, { status: 400 });
    }

    const resource = await getProtectedResource(user.id, kind, body.id, mode);
    if (!resource) return NextResponse.json({ error: 'Resource available nahi hai.' }, { status: 404 });
    if (purpose === 'offline') {
      const settings = await getPlatformSettings();
      if (!getPlanFromSettings(settings, resource.tier).access.downloadPDF) {
        return NextResponse.json({ error: 'Offline save Pro/Elite mein available hai.' }, { status: 403 });
      }
    }

    const remote = await fetchProtectedFile(resource);
    if (!remote.body) throw new Error('Resource stream empty hai.');
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
  } catch (error) {
    console.error('Protected resource stream failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resource open nahi ho saka.' },
      { status: 502 }
    );
  }
}
