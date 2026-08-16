import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getParentLinkAccess } from '@/lib/parent/access';
import { getR2SignedUrl, parseR2Uri } from '@/lib/storage/r2';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const attachmentId = req.nextUrl.searchParams.get('id');
  if (!attachmentId) return NextResponse.json({ error: 'An attachment ID is required' }, { status: 400 });

  const chatsAdmin = createServiceClient() as any;
  const { data: attachment, error } = await chatsAdmin
    .from('parent_attachments')
    .select('*')
    .eq('id', attachmentId)
    .maybeSingle();
  if (error || !attachment) return NextResponse.json({ error: 'The file was not found' }, { status: 404 });

  const access = await getParentLinkAccess(attachment.link_id, user.id);
  if (!access) return NextResponse.json({ error: 'This file does not belong to your account' }, { status: 403 });

  const parsed = parseR2Uri(attachment.file_url);
  if (!parsed) return NextResponse.json({ error: 'This file uses legacy storage' }, { status: 409 });
  const signedUrl = await getR2SignedUrl(parsed.key, undefined, parsed.bucket);
  return NextResponse.redirect(signedUrl);
}
