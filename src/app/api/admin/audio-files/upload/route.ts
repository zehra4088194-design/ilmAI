import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import {
  abortR2MultipartUpload,
  completeR2MultipartUpload,
  createR2MultipartUpload,
  getAudioBucketName,
  getR2Uri,
  isAudioStorageConfigured,
  uploadR2Part,
} from '@/lib/storage/r2';
import { MAX_AUDIO_BYTES, buildAudioKey, resolveAudioConfig } from '@/lib/storage/audioUpload';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Same-origin multipart upload endpoint. Each request is a small part, so hosting proxies do not
 * need to buffer the complete audio file before the server can forward it to B2.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAudioStorageConfigured()) {
    return NextResponse.json({ error: 'The audio storage bucket is not configured yet.' }, { status: 503 });
  }

  try {
    const bucket = getAudioBucketName() || undefined;
    const action = req.headers.get('x-audio-action') || 'init';
    if (action === 'init') {
      const body = await req.json().catch(() => null);
      const filename = String(body?.filename || '').trim();
      const declaredType = String(body?.contentType || '');
      const size = Number(body?.size) || 0;
      const scope = String(body?.scope || 'general');
      const config = resolveAudioConfig(declaredType, filename);
      if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });
      if (!config) return NextResponse.json({ error: 'Unsupported audio format.' }, { status: 400 });
      if (size <= 0 || size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Audio file is too large (300MB limit).' }, { status: 400 });
      }
      const key = buildAudioKey(filename, scope, config.extension);
      const uploadId = await createR2MultipartUpload(key, config.contentType, bucket);
      return NextResponse.json({ uploadId, key, size, contentType: config.contentType, partSize: 8 * 1024 * 1024 });
    }

    const key = String(req.headers.get('x-audio-key') || '');
    const uploadId = String(req.headers.get('x-audio-upload-id') || '');
    if (!key || !uploadId)
      return NextResponse.json({ error: 'Multipart upload details are missing.' }, { status: 400 });

    if (action === 'part') {
      const partNumber = Number(req.headers.get('x-audio-part-number'));
      const bytes = Buffer.from(await req.arrayBuffer());
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000 || !bytes.length) {
        return NextResponse.json({ error: 'Invalid audio part.' }, { status: 400 });
      }
      const etag = await uploadR2Part(key, uploadId, partNumber, bytes, bucket);
      return NextResponse.json({ partNumber, etag });
    }

    if (action === 'complete') {
      const body = await req.json().catch(() => null);
      const parts = Array.isArray(body?.parts)
        ? body.parts
            .map((part: { partNumber?: number; etag?: string }) => ({
              partNumber: Number(part.partNumber),
              etag: String(part.etag || ''),
            }))
            .filter((part: { partNumber: number; etag: string }) => Number.isInteger(part.partNumber) && part.etag)
        : [];
      if (!parts.length) return NextResponse.json({ error: 'No uploaded audio parts were supplied.' }, { status: 400 });
      await completeR2MultipartUpload(key, uploadId, parts, bucket);
      return NextResponse.json({ uri: getR2Uri(key, bucket), key });
    }

    if (action === 'abort') {
      await abortR2MultipartUpload(key, uploadId, bucket);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown upload action.' }, { status: 400 });
  } catch (error) {
    console.error('[audio-files/upload] failed to upload audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Could not upload audio: ${error.message}` : 'Could not upload audio.' },
      { status: 502 }
    );
  }
}
