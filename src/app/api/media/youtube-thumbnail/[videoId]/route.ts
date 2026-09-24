import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeThumbnailCandidates, extractYouTubeId } from '@/lib/utils/extractYouTubeId';
import { createAdminClient } from '@/lib/supabase/server';
import { getR2Object, isR2Configured, putR2Object } from '@/lib/storage/r2';

export const runtime = 'nodejs';

const THUMBNAIL_BUCKET = 'lecture-thumbnails';

function thumbnailResponse(body: BodyInit, contentType: string, cacheStatus: 'HIT' | 'MISS') {
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      'X-Content-Type-Options': 'nosniff',
      'X-Thumbnail-Cache': cacheStatus,
    },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const validId = extractYouTubeId(videoId);
  if (!validId) return NextResponse.json({ error: 'Invalid YouTube video id' }, { status: 400 });
  const path = `${validId}.jpg`;

  if (isR2Configured()) {
    try {
      const cached = await getR2Object(`youtube-thumbnails/${path}`);
      if (cached && cached.body.byteLength > 1024) {
        return thumbnailResponse(cached.body, cached.contentType, 'HIT');
      }
    } catch (error) {
      console.warn('R2 thumbnail cache read failed:', error);
    }
  }

  let admin: Awaited<ReturnType<typeof createAdminClient>> | null = null;
  try {
    admin = await createAdminClient();
    const { data } = await admin.storage.from(THUMBNAIL_BUCKET).download(path);
    if (data && data.size > 1024) {
      return thumbnailResponse(data, data.type || 'image/jpeg', 'HIT');
    }
  } catch {
    // The upstream fallback still works before the cache bucket is migrated.
  }

  for (const url of getYouTubeThumbnailCandidates(validId)) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'ilm-ai-thumbnail-fetcher/1.0' },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;
      const body = await response.arrayBuffer();
      if (body.byteLength < 1024) continue;
      if (isR2Configured()) {
        await putR2Object(`youtube-thumbnails/${path}`, Buffer.from(body), {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        }).catch((cacheError) => console.warn('R2 thumbnail cache save failed:', cacheError));
      } else if (admin) {
        await admin.storage
          .from(THUMBNAIL_BUCKET)
          .upload(path, Buffer.from(body), { contentType, cacheControl: '31536000', upsert: true })
          .catch((cacheError) => console.warn('YouTube thumbnail cache save failed:', cacheError));
      }
      return thumbnailResponse(body, contentType, 'MISS');
    } catch {
      // Try the next known thumbnail size/host.
    }
  }

  return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
}
