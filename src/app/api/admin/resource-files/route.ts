import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { getR2Uri, isR2Configured, putR2Object } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF_BYTES = 125 * 1024 * 1024;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, { contentType: string; extension: string; maxBytes: number; prefix: string }> = {
  pdf: { contentType: 'application/pdf', extension: 'pdf', maxBytes: MAX_PDF_BYTES, prefix: 'pdfs' },
  txt: { contentType: 'text/plain; charset=utf-8', extension: 'txt', maxBytes: MAX_TEXT_BYTES, prefix: 'txt' },
};

function cleanStem(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'resource'
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
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'Object storage is not configured.' }, { status: 503 });
  }

  const form = await req.formData();
  const type = String(form.get('type') || '').toLowerCase();
  const config = ALLOWED_TYPES[type];
  const file = form.get('file');
  if (!config || !(file instanceof File)) {
    return NextResponse.json({ error: 'Upload a PDF or TXT file.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > config.maxBytes) {
    return NextResponse.json({ error: `${type.toUpperCase()} file is too large.` }, { status: 400 });
  }
  if (type === 'pdf' && file.type && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed here.' }, { status: 400 });
  }
  if (type === 'txt' && file.type && !file.type.startsWith('text/')) {
    return NextResponse.json({ error: 'Only TXT files are allowed here.' }, { status: 400 });
  }

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const scope = cleanScope(form.get('scope'));
  const key = `resources/${config.prefix}/${scope}/${yyyy}/${mm}/${cleanStem(file.name)}-${randomUUID().slice(0, 10)}.${config.extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await putR2Object(key, bytes, {
    contentType: config.contentType,
    cacheControl: type === 'txt' ? 'private, max-age=3600' : 'private, max-age=86400',
  });

  return NextResponse.json({
    uri: getR2Uri(key),
    key,
    size: bytes.byteLength,
    contentType: config.contentType,
  });
}
