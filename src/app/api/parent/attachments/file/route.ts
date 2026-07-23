import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getParentLinkAccess } from '@/lib/parent/access';
import { getR2Object, parseR2Uri } from '@/lib/storage/r2';

export const runtime = 'nodejs';

function safeFileName(value: string) {
  return value.replace(/[\r\n"]/g, '_').slice(0, 180);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const attachmentId = req.nextUrl.searchParams.get('id');
  if (!attachmentId) return NextResponse.json({ error: 'An attachment ID is required' }, { status: 400 });

  const admin = await createAdminClient();
  const { data: attachment, error } = await admin
    .from('parent_attachments')
    .select('*')
    .eq('id', attachmentId)
    .maybeSingle();
  if (error || !attachment) return NextResponse.json({ error: 'The file was not found' }, { status: 404 });

  const access = await getParentLinkAccess(attachment.link_id, user.id);
  if (!access) return NextResponse.json({ error: 'This file does not belong to your account' }, { status: 403 });

  const key = parseR2Uri(attachment.file_url);
  if (!key) return NextResponse.json({ error: 'This file uses legacy storage' }, { status: 409 });
  const object = await getR2Object(key);
  if (!object) return NextResponse.json({ error: 'The archived file was not found' }, { status: 404 });

  return new NextResponse(object.body, {
    headers: {
      'Content-Type': attachment.file_type || object.contentType,
      'Content-Disposition': `inline; filename="${safeFileName(attachment.file_name)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
