import { NextResponse } from 'next/server';
import { readPresentationBackground } from '@/lib/presentation/backgrounds';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const image = await readPresentationBackground(name);
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const extension = image.name.split('.').pop()?.toLowerCase();
  const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
