import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { getAudioBucketName, getR2Uri, isAudioStorageConfigured, putR2Object } from '@/lib/storage/r2';
import { MAX_AUDIO_BYTES, buildAudioKey, resolveAudioConfig } from '@/lib/storage/audioUpload';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Same-origin upload endpoint. The browser never talks to B2 directly, avoiding storage CORS
 * failures. Buffering here is intentional: the S3-compatible B2 client reliably completes a
 * normal Buffer upload, while forwarding a Web ReadableStream can remain pending behind proxies.
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
  try {
    const bytes = Buffer.from(await req.arrayBuffer());
    if (!bytes.length) return NextResponse.json({ error: 'Audio file body is missing.' }, { status: 400 });
    if (bytes.length > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file is too large (300MB limit).' }, { status: 400 });
    }
    if (size !== bytes.length) {
      return NextResponse.json({ error: 'Audio upload was incomplete. Please try again.' }, { status: 400 });
    }
    const bucket = getAudioBucketName() || undefined;
    const key = buildAudioKey(filename, scope, config.extension);
    await putR2Object(key, bytes, { contentType: config.contentType }, bucket);
    return NextResponse.json({ uri: getR2Uri(key, bucket), key, size: bytes.length, contentType: config.contentType });
  } catch (error) {
    console.error('[audio-files/upload] failed to upload audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Could not upload audio: ${error.message}` : 'Could not upload audio.' },
      { status: 502 }
    );
  }
}
