import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProtectedResource, type ProtectedResourceKind, type ResourceMode } from '@/lib/resources/server';
import { getEmbeddableFilePreviewUrl } from '@/lib/utils/filePreview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESOURCE_KINDS = new Set<ProtectedResourceKind>(['library', 'past-paper', 'college-resource']);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required hai.' }, { status: 401 });

    const kind = req.nextUrl.searchParams.get('kind') as ProtectedResourceKind | null;
    const id = req.nextUrl.searchParams.get('id');
    const mode: ResourceMode = req.nextUrl.searchParams.get('mode') === 'dark' ? 'dark' : 'light';
    if (!kind || !RESOURCE_KINDS.has(kind) || !id) {
      return NextResponse.json({ error: 'Invalid resource request.' }, { status: 400 });
    }

    const resource = await getProtectedResource(user.id, kind, id, mode);
    if (!resource) return NextResponse.json({ error: 'Resource available nahi hai.' }, { status: 404 });

    const previewUrl = getEmbeddableFilePreviewUrl(resource.sourceUrl);
    if (!previewUrl) {
      return NextResponse.json({ error: 'Is file ka inline preview available nahi hai.' }, { status: 422 });
    }

    const response = NextResponse.redirect(previewUrl, 307);
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    console.error('Resource preview failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resource preview open nahi ho saka.' },
      { status: 500 }
    );
  }
}
