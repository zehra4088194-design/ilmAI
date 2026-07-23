import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { getParentLinkAccess } from '@/lib/parent/access';
import { loadArchivedChatMessages, mergeChatMessages } from '@/lib/storage/chat-archive';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const linkId = req.nextUrl.searchParams.get('linkId');
  if (!linkId) return NextResponse.json({ error: 'A link ID is required' }, { status: 400 });
  const access = await getParentLinkAccess(linkId, user.id);
  if (!access) return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }
  const { link } = access;

  const admin = await createAdminClient();
  await admin
    .from('parent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('link_id', linkId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  const { data, error } = await admin
    .from('parent_messages')
    .select('*')
    .eq('link_id', linkId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages could not be loaded.' }, { status: 500 });
  const archived = await loadArchivedChatMessages<any>(admin, 'parent', linkId);
  return NextResponse.json({ messages: mergeChatMessages(archived, data || []) });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { linkId, content } = await req.json();
  if (!linkId || !content?.trim()) {
    return NextResponse.json({ error: 'A link ID and message content are required' }, { status: 400 });
  }

  const access = await getParentLinkAccess(linkId, user.id);
  if (!access || !access.link.student_id)
    return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }
  const { link } = access;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('parent_messages')
    .insert({ link_id: linkId, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 500 });

  const recipientId = user.id === link.parent_id ? link.student_id : link.parent_id;
  if (!recipientId) return NextResponse.json({ error: 'The linked recipient was not found.' }, { status: 409 });
  await createNotificationIfEnabled(admin, 'parentMessages', {
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New parent message',
    message: content.trim().slice(0, 120),
    link:
      user.id === link.parent_id
        ? `/settings?tab=parent-link&linkId=${encodeURIComponent(linkId)}&view=chat`
        : `/parent?linkId=${encodeURIComponent(linkId)}&view=chat`,
    is_read: false,
  });

  return NextResponse.json({ message: data });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { linkId } = await req.json();
  if (!linkId) return NextResponse.json({ error: 'A link ID is required' }, { status: 400 });

  const access = await getParentLinkAccess(linkId, user.id);
  if (!access) return NextResponse.json({ error: 'This link does not belong to your account.' }, { status: 403 });
  if (!access.plan.access.parentDashboard) {
    return NextResponse.json(
      { error: 'Parent chat is available when the linked student has a Pro or Elite plan.' },
      { status: 403 }
    );
  }
  const { link } = access;

  const admin = await createAdminClient();
  const { error } = await admin
    .from('parent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('link_id', linkId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  if (error) return NextResponse.json({ error: 'The read status could not be updated.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
