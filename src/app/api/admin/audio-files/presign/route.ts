import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { getAudioBucketName, getR2SignedPutUrl, getR2Uri, isAudioStorageConfigured } from '@/lib/storage/r2';
import { MAX_AUDIO_BYTES, buildAudioKey, resolveAudioConfig } from '@/lib/storage/audioUpload';

export const runtime = 'nodejs';

/**
 * Mints a short-lived presigned PUT URL so the admin's browser can upload an audio file straight
 * to the B2 audio bucket — the file's bytes never pass through this app server at all. Replaces
 * the old "browser -> our server -> B2" proxy upload, which routed the whole file through the
 * Next.js container's memory and request lifetime: a large (100MB+) track could OOM the container
 * or outlast a proxy timeout, surfacing as an opaque "Upload failed" / HTTP 502 with no real cause.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAudioStorageConfigured()) {
    return NextResponse.json(
      { error: 'The audio storage bucket is not configured yet. Add AUDIO_STORAGE_* env vars first.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const filename = String(body?.filename || '').trim();
  const declaredType = String(body?.contentType || '');
  const size = Number(body?.size) || 0;
  const scope = String(body?.scope || 'general');

  if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });
  const config = resolveAudioConfig(declaredType, filename);
  if (!config) {
    return NextResponse.json({ error: 'Unsupported audio format. Use MP3, WAV, M4A, AAC, OGG, or FLAC.' }, { status: 400 });
  }
  if (size <= 0 || size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file is too large (300MB limit).' }, { status: 400 });
  }

  try {
    const bucket = getAudioBucketName() || undefined;
    const key = buildAudioKey(filename, scope, config.extension);
    const uploadUrl = await getR2SignedPutUrl(key, config.contentType, bucket);
    return NextResponse.json({ uploadUrl, key, uri: getR2Uri(key, bucket), contentType: config.contentType });
  } catch (error) {
    console.error('[audio-files/presign] failed to mint upload URL:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Could not prepare the upload: ${message}` }, { status: 502 });
  }
}
