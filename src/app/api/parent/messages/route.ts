import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getApprovedLink(linkId: string, userId: string) {
  const admin = await createAdminClient();
  const { data } = await admin
    .from('parent_student_links')
    .select('id, parent_id, student_id, status')
    .eq('id', linkId)
    .maybeSingle();
  if (!data || data.status !== 'approved' || (data.parent_id !== userId && data.student_id !== userId)) return null;
  return data;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const linkId = req.nextUrl.searchParams.get('linkId');
  if (!linkId) return NextResponse.json({ error: 'linkId required hai' }, { status: 400 });
  const link = await getApprovedLink(linkId, user.id);
  if (!link) return NextResponse.json({ error: 'Ye link aapka nahi hai' }, { status: 403 });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('parent_messages')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages load nahi hue' }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { linkId, content } = await req.json();
  if (!linkId || !content?.trim()) {
    return NextResponse.json({ error: 'linkId aur content required hain' }, { status: 400 });
  }

  const link = await getApprovedLink(linkId, user.id);
  if (!link || !link.student_id) return NextResponse.json({ error: 'Ye link aapka nahi hai' }, { status: 403 });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('parent_messages')
    .insert({ link_id: linkId, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Message send nahi hua' }, { status: 500 });

  const recipientId = user.id === link.parent_id ? link.student_id : link.parent_id;
  await admin.from('notifications').insert({
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New parent message',
    message: content.trim().slice(0, 120),
    link: user.id === link.parent_id ? '/settings' : '/parent',
    is_read: false,
  });

  return NextResponse.json({ message: data });
}
