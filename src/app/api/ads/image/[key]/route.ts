import { NextResponse } from 'next/server';
import { readAdBannerImage } from '@/lib/ads/storage';

export const runtime = 'nodejs';

// Public, unauthenticated — banners render on logged-out pages (library/past-papers/blog), so
// the image itself can't sit behind an admin-only proxy the way presentation backgrounds do.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const image = await readAdBannerImage(key);
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
