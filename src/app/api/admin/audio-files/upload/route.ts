import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { getAudioBucketName, getR2Uri, isAudioStorageConfigured, putR2Stream } from '@/lib/storage/r2';
import { MAX_AUDIO_BYTES, buildAudioKey, resolveAudioConfig } from '@/lib/storage/audioUpload';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Same-origin fallback for browsers that cannot complete a direct B2 PUT because the bucket's
 * CORS policy rejects the preflight. The request body is streamed to storage and never buffered
 * in the Next.js process.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAudioStorageConfigured()) {
    return NextResponse.json({ error: 'The audio storage bucket is not configured yet.' }, { status: 503 });
  }

  const filename = decodeURIComponent(req.headers.get('x-audio-filename') || '').trim();
  const declaredType = req.headers.get('content-type') || '';
  const size = Number(req.headers.get('x-audio-size')) || Number(req.headers.get('content-length')) || 0;
  const scope = req.headers.get('x-audio-scope') || 'general';
  const config = resolveAudioConfig(declaredType, filename);

  if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });
  if (!config) return NextResponse.json({ error: 'Unsupported audio format.' }, { status: 400 });
  if (size <= 0 || size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file is too large (300MB limit).' }, { status: 400 });
  }
  if (!req.body) return NextResponse.json({ error: 'Audio file body is missing.' }, { status: 400 });

  try {
    const bucket = getAudioBucketName() || undefined;
    const key = buildAudioKey(filename, scope, config.extension);
    await putR2Stream(key, req.body, { contentType: config.contentType, contentLength: size }, bucket);
    return NextResponse.json({ uri: getR2Uri(key, bucket), key, size, contentType: config.contentType });
  } catch (error) {
    console.error('[audio-files/upload] failed to stream audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Could not upload audio: ${error.message}` : 'Could not upload audio.' },
      { status: 502 }
    );
  }
}
