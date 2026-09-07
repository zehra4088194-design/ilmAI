import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { resolveAttachmentSignedUrl, uploadChatAttachment } from '@/lib/storage/chat-attachments';

/**
 * Messages within one direct_conversations thread. RLS on direct_conversations /
 * direct_messages already restricts every query below to the two participants —
 * this route does no extra membership checks of its own, same trust boundary as
 * /api/parent/messages.
 */

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const db = supabase as any;

  const { data: messages, error } = await db
    .from('direct_messages')
    .select('id, conversation_id, sender_id, content, read_at, created_at, attachment_url, attachment_name, attachment_type, attachment_size_kb')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: 'Messages could not be loaded.' }, { status: 500 });

  await db
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  const withUrls = await Promise.all(
    (messages || []).map(async (m: any) => ({ ...m, attachment_signed_url: await resolveAttachmentSignedUrl(m.attachment_url) }))
  );
  return NextResponse.json({ messages: withUrls });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let content = '';
  let file: File | null = null;
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    content = ((formData.get('content') as string | null) || '').trim();
    file = (formData.get('file') as File | null) || null;
  } else {
    const body = await req.json();
    content = typeof body.content === 'string' ? body.content.trim() : '';
  }
  if (!content && !file) return NextResponse.json({ error: 'Message content or a file is required' }, { status: 400 });

  const db = supabase as any;
  const { data: conversation } = await db
    .from('direct_conversations')
    .select('id, participant_one_id, participant_two_id, relationship_type')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (user.id !== conversation.participant_one_id && user.id !== conversation.participant_two_id) {
    return NextResponse.json({ error: 'This conversation does not belong to your account.' }, { status: 403 });
  }

  let attachment: { url: string; name: string; type: string; sizeKb: number } | null = null;
  if (file) {
    try {
      attachment = await uploadChatAttachment(file, `direct-messages/${conversationId}`);
    } catch (uploadError) {
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'The file could not be uploaded.' },
        { status: 400 }
      );
    }
  }

  const { data: message, error } = await db
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.slice(0, 4000),
      attachment_url: attachment?.url || null,
      attachment_name: attachment?.name || null,
      attachment_type: attachment?.type || null,
      attachment_size_kb: attachment?.sizeKb || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 500 });
  message.attachment_signed_url = await resolveAttachmentSignedUrl(message.attachment_url);

  const recipientId =
    conversation.participant_one_id === user.id ? conversation.participant_two_id : conversation.participant_one_id;
  const admin = await createAdminClient();
  await createNotificationIfEnabled(admin, 'directMessages', {
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New message',
    message: content ? content.slice(0, 120) : `Sent a file: ${attachment?.name || 'attachment'}`,
    link: '/messages?conversationId=' + encodeURIComponent(conversationId),
    is_read: false,
  }).catch((err) => console.error('Direct message notification failed:', err));

  return NextResponse.json({ message });
}

// Deletes the conversation (and, via direct_messages' ON DELETE CASCADE, every message in it) —
// either participant may delete it. RLS on direct_conversations has no delete policy for regular
// users, so this goes through the admin client after confirming the caller is actually a
// participant — same trust boundary this route already uses elsewhere.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: conversation } = await db
    .from('direct_conversations')
    .select('id, participant_one_id, participant_two_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (user.id !== conversation.participant_one_id && user.id !== conversation.participant_two_id) {
    return NextResponse.json({ error: 'This conversation does not belong to your account.' }, { status: 403 });
  }

  const admin = (await createAdminClient()) as any;
  const { error } = await admin.from('direct_conversations').delete().eq('id', conversationId);
  if (error) return NextResponse.json({ error: 'The chat could not be deleted.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
