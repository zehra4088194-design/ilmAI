import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { deleteR2Object, parseR2Uri } from '@/lib/storage/r2';

export const runtime = 'nodejs';

// Uploading now goes through POST /api/admin/audio-files/presign (a presigned PUT straight to B2 —
// see that route's doc comment for why). This route only ever needs to delete an object now.
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
