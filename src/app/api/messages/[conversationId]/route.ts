import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

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
    .select('id, conversation_id, sender_id, content, read_at, created_at')
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

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Message content is required' }, { status: 400 });

  const db = supabase as any;
  const { data: conversation } = await db
    .from('direct_conversations')
    .select('id, participant_one_id, participant_two_id, relationship_type')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const { data: message, error } = await db
    .from('direct_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim().slice(0, 4000) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 500 });

  const recipientId =
    conversation.participant_one_id === user.id ? conversation.participant_two_id : conversation.participant_one_id;
  const admin = await createAdminClient();
  await createNotificationIfEnabled(admin, 'directMessages', {
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New message',
    message: content.trim().slice(0, 120),
    link: '/messages?conversationId=' + encodeURIComponent(conversationId),
    is_read: false,
  }).catch((err) => console.error('Direct message notification failed:', err));

  return NextResponse.json({ message });
}
