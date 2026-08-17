import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { deleteR2Object, getAudioBucketName, getR2Uri, isAudioStorageConfigured, parseR2Uri, putR2Object } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 150 * 1024 * 1024; // 150MB — comfortably covers a long spoken-word episode
const ALLOWED_AUDIO: Record<string, { contentType: string; extension: string }> = {
  'audio/mpeg': { contentType: 'audio/mpeg', extension: 'mp3' },
  'audio/mp3': { contentType: 'audio/mpeg', extension: 'mp3' },
  'audio/wav': { contentType: 'audio/wav', extension: 'wav' },
  'audio/x-wav': { contentType: 'audio/wav', extension: 'wav' },
  'audio/mp4': { contentType: 'audio/mp4', extension: 'm4a' },
  'audio/x-m4a': { contentType: 'audio/mp4', extension: 'm4a' },
  'audio/aac': { contentType: 'audio/aac', extension: 'aac' },
  'audio/ogg': { contentType: 'audio/ogg', extension: 'ogg' },
  'audio/webm': { contentType: 'audio/webm', extension: 'webm' },
  'audio/flac': { contentType: 'audio/flac', extension: 'flac' },
};

function cleanStem(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'track'
  );
}

function cleanScope(value: FormDataEntryValue | null) {
  const text = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '')
    .slice(0, 160);
  return text && !text.includes('..') ? text : 'general';
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAudioStorageConfigured()) {
    return NextResponse.json(
      { error: 'The audio storage bucket is not configured yet. Add AUDIO_STORAGE_* env vars first.' },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Upload an audio file.' }, { status: 400 });
  }
  const declaredType = (file.type || '').toLowerCase();
  const byExtension = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.exec(file.name)?.[1]?.toLowerCase();
  const config =
    ALLOWED_AUDIO[declaredType] ||
    (byExtension === 'mp3' ? ALLOWED_AUDIO['audio/mpeg'] : undefined) ||
    (byExtension === 'wav' ? ALLOWED_AUDIO['audio/wav'] : undefined) ||
    (byExtension === 'm4a' ? ALLOWED_AUDIO['audio/mp4'] : undefined) ||
    (byExtension ? ALLOWED_AUDIO[`audio/${byExtension}`] : undefined);
  if (!config) {
    return NextResponse.json({ error: 'Unsupported audio format. Use MP3, WAV, M4A, AAC, OGG, or FLAC.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file is too large (150MB limit).' }, { status: 400 });
  }

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const scope = cleanScope(form.get('scope'));
  const bucket = getAudioBucketName() || undefined;
  const key = `audio/${scope}/${yyyy}/${mm}/${cleanStem(file.name)}-${randomUUID().slice(0, 10)}.${config.extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await putR2Object(key, bytes, { contentType: config.contentType, cacheControl: 'private, max-age=86400' }, bucket);

  return NextResponse.json({
    uri: getR2Uri(key, bucket),
    key,
    size: bytes.byteLength,
    contentType: config.contentType,
  });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const uri = req.nextUrl.searchParams.get('uri');
  if (!uri) return NextResponse.json({ error: 'Storage uri required' }, { status: 400 });
  const parsed = parseR2Uri(uri);
  if (!parsed) return NextResponse.json({ error: 'Unrecognized storage uri' }, { status: 400 });
  await deleteR2Object(parsed.key, parsed.bucket);
  return NextResponse.json({ success: true });
}
