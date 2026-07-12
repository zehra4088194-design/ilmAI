import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeThumbnailCandidates, extractYouTubeId } from '@/lib/utils/extractYouTubeId';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const validId = extractYouTubeId(videoId);
  if (!validId) return NextResponse.json({ error: 'Invalid YouTube video id' }, { status: 400 });

  for (const url of getYouTubeThumbnailCandidates(validId)) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'ilm-ai-thumbnail-fetcher/1.0' },
        next: { revalidate: 60 * 60 * 24 },
      });
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;
      const body = await response.arrayBuffer();
      if (body.byteLength < 1024) continue;

      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
      });
    } catch {
      // Try the next known thumbnail size/host.
    }
  }

  return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
}
