import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import {
  deletePresentationBackground,
  listPresentationBackgrounds,
  savePresentationBackground,
} from '@/lib/presentation/backgrounds';

export const runtime = 'nodejs';

async function authorize() {
  return Boolean(await requireAdminUser());
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ backgrounds: await listPresentationBackgrounds() });
}

export async function POST(req: NextRequest) {
  if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const form = await req.formData();
    const files = form.getAll('images').filter((value): value is File => value instanceof File).slice(0, 20);
    if (!files.length) return NextResponse.json({ error: 'Choose at least one image.' }, { status: 400 });
    const subject = String(form.get('subject') || '').trim();
    const keywords = String(form.get('keywords') || '')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    const category = String(form.get('category') || '').trim();
    const isGlobal = form.get('isGlobal') === 'true';
    if (!isGlobal && !subject && !keywords.length) {
      return NextResponse.json({ error: 'Add a subject or keywords, or mark the images as general.' }, { status: 400 });
    }
    const backgrounds = [];
    for (const file of files) backgrounds.push(await savePresentationBackground(file, { subject, keywords, category, isGlobal }));
    return NextResponse.json({ backgrounds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await authorize())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const name = new URL(req.url).searchParams.get('name') || '';
    await deletePresentationBackground(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed.' }, { status: 400 });
  }
}
