import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getApprovedRequest(admin: any, requestId: string, userId: string) {
  const { data } = await admin
    .from('student_chat_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'approved')
    .maybeSingle();
  if (!data || (data.requester_id !== userId && data.recipient_id !== userId)) return null;
  return data;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'requestId required hai' }, { status: 400 });

  const admin = await createAdminClient() as any;
  const request = await getApprovedRequest(admin, requestId, user.id);
  if (!request) return NextResponse.json({ error: 'Approved chat nahi mili.' }, { status: 403 });

  const { data, error } = await admin
    .from('student_chat_messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages load nahi hue. Migration 011 check karein.' }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { requestId, content } = await req.json();
  const message = typeof content === 'string' ? content.trim() : '';
  if (!requestId || !message) return NextResponse.json({ error: 'requestId aur message required hain' }, { status: 400 });

  const admin = await createAdminClient() as any;
  const { data: profile } = await admin.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
  const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  if (!plan.access.studentChat) {
    return NextResponse.json({ error: 'Student chat messaging is plan mein locked hai. Free users request bhej/accept kar sakte hain.' }, { status: 403 });
  }

  const request = await getApprovedRequest(admin, requestId, user.id);
  if (!request) return NextResponse.json({ error: 'Approved chat nahi mili.' }, { status: 403 });

  const { data, error } = await admin
    .from('student_chat_messages')
    .insert({ request_id: requestId, sender_id: user.id, content: message })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Message send nahi hua.' }, { status: 500 });

  const recipientId = user.id === request.requester_id ? request.recipient_id : request.requester_id;
  await admin.from('notifications').insert({
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New study buddy message',
    message: message.slice(0, 120),
    link: '/student-chat',
    is_read: false,
  });

  return NextResponse.json({ message: data });
}
