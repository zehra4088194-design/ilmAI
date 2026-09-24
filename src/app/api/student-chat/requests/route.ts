import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { deleteChatArchive } from '@/lib/storage/chat-archive';

type ChatRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  updated_at: string;
};

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// `admin` here is always the MAIN project's client — profiles/notifications live there.
async function decorateRequests(admin: any, requests: ChatRequest[]) {
  const ids = Array.from(new Set(requests.flatMap((request) => [request.requester_id, request.recipient_id])));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, username, avatar_url, subscription_tier, grade_level, board, gender')
    .in('id', ids);
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
  return requests.map((request) => ({
    ...request,
    requester: profileMap.get(request.requester_id) || null,
    recipient: profileMap.get(request.recipient_id) || null,
  }));
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const admin = (await createAdminClient()) as any;
  const chatsAdmin = createServiceClient() as any;
  const { data, error } = await chatsAdmin
    .from('student_chat_requests')
    .select('*')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Student chat is not configured.' },
      { status: 500 }
    );
  }
  const decorated = await decorateRequests(admin, data || []);
  return NextResponse.json({ requests: decorated });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { recipientIdentifier, recipientEmail } = await req.json();
  const identifier =
    typeof recipientIdentifier === 'string'
      ? recipientIdentifier.trim().toLowerCase()
      : typeof recipientEmail === 'string'
        ? recipientEmail.trim().toLowerCase()
        : '';
  if (!identifier) return NextResponse.json({ error: 'A student username or email is required' }, { status: 400 });

  const admin = (await createAdminClient()) as any;
  const chatsAdmin = createServiceClient() as any;
  const { data: me } = await admin.from('profiles').select('id, role, gender').eq('id', user.id).maybeSingle();
  if (me?.role && me.role !== 'student') {
    return NextResponse.json({ error: 'Student chat is available only to student accounts.' }, { status: 403 });
  }
  if (me?.gender !== 'girl' && me?.gender !== 'boy') {
    return NextResponse.json({ error: 'Select your gender in Settings first.' }, { status: 403 });
  }

  const username = identifier.replace(/^@/, '');
  const { data: emailRecipient } = await admin
    .from('profiles')
    .select('id, email, username, role, full_name, gender')
    .eq('email', identifier)
    .maybeSingle();
  const { data: usernameRecipient } = emailRecipient
    ? { data: null }
    : await admin
        .from('profiles')
        .select('id, email, username, role, full_name, gender')
        .eq('username', username)
        .maybeSingle();
  const recipient = emailRecipient || usernameRecipient;
  if (!recipient || recipient.role !== 'student') {
    return NextResponse.json({ error: 'No student account was found for this username or email.' }, { status: 404 });
  }
  if (recipient.id === user.id) {
    return NextResponse.json({ error: 'You cannot send a request to yourself.' }, { status: 400 });
  }

  const { data: existing } = await chatsAdmin
    .from('student_chat_requests')
    .select('*')
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${recipient.id}),and(requester_id.eq.${recipient.id},recipient_id.eq.${user.id})`
    )
    .neq('status', 'declined')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: existing.status === 'approved' ? 'The chat is already approved.' : 'The request is already pending.' },
      { status: 409 }
    );
  }

  const { data, error } = await chatsAdmin
    .from('student_chat_requests')
    .insert({ requester_id: user.id, recipient_id: recipient.id, status: 'pending' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'The request could not be sent. Check the chats DB schema.' }, { status: 500 });

  await createNotificationIfEnabled(admin, 'studentChat', {
    user_id: recipient.id,
    type: 'SOCIAL',
    title: 'New study buddy request',
    message: 'A student sent you a chat request.',
    link: `/student-chat?requestId=${data.id}`,
    is_read: false,
  });

  return NextResponse.json({ request: (await decorateRequests(admin, [data]))[0] });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { requestId, status } = await req.json();
  if (!requestId || (status !== 'approved' && status !== 'declined')) {
    return NextResponse.json({ error: 'A valid request ID and status are required' }, { status: 400 });
  }

  const admin = (await createAdminClient()) as any;
  const chatsAdmin = createServiceClient() as any;
  const { data: existing } = await chatsAdmin
    .from('student_chat_requests')
    .select('*')
    .eq('id', requestId)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'The pending request was not found.' }, { status: 404 });

  const { data, error } = await chatsAdmin
    .from('student_chat_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'The request could not be updated.' }, { status: 500 });

  await createNotificationIfEnabled(admin, 'studentChat', {
    user_id: existing.requester_id,
    type: 'SOCIAL',
    title: status === 'approved' ? 'Study buddy request approved' : 'Study buddy request declined',
    message:
      status === 'approved'
        ? 'You can now connect. Messaging is available on Pro and Elite.'
        : 'Your request was declined.',
    link: `/student-chat?requestId=${data.id}`,
    is_read: false,
  });

  return NextResponse.json({ request: (await decorateRequests(admin, [data]))[0] });
}

// Deletes a chat entirely (the request row and, via student_chat_messages_request_id_fkey's
// ON DELETE CASCADE, every message in it) — either participant can delete it, at any status
// (pending, approved, or declined), same as clearing a WhatsApp chat.
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'A request ID is required' }, { status: 400 });

  const chatsAdmin = createServiceClient() as any;
  const { data: deleted, error } = await chatsAdmin
    .from('student_chat_requests')
    .delete()
    .eq('id', requestId)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'The chat could not be deleted.' }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });

  await deleteChatArchive(chatsAdmin, 'student', requestId).catch((err) =>
    console.error('Student chat archive cleanup failed:', err)
  );

  return NextResponse.json({ success: true });
}
