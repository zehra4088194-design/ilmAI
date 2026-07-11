import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function decorateRequests(admin: any, requests: ChatRequest[]) {
  const ids = Array.from(new Set(requests.flatMap((request) => [request.requester_id, request.recipient_id])));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url, subscription_tier, grade_level, board')
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

  const admin = await createAdminClient() as any;
  const { data, error } = await admin
    .from('student_chat_requests')
    .select('*')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Student chat table setup nahi hui. Migration 011 run karein.' }, { status: 500 });
  }
  return NextResponse.json({ requests: await decorateRequests(admin, data || []) });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { recipientEmail } = await req.json();
  const email = typeof recipientEmail === 'string' ? recipientEmail.trim().toLowerCase() : '';
  if (!email) return NextResponse.json({ error: 'Student email required hai' }, { status: 400 });

  const admin = await createAdminClient() as any;
  const { data: me } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (me?.role && me.role !== 'student') {
    return NextResponse.json({ error: 'Student chat sirf student accounts ke liye hai.' }, { status: 403 });
  }

  const { data: recipient } = await admin
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', email)
    .maybeSingle();
  if (!recipient || recipient.role !== 'student') {
    return NextResponse.json({ error: 'Is email se student account nahi mila.' }, { status: 404 });
  }
  if (recipient.id === user.id) {
    return NextResponse.json({ error: 'Apne aap ko request nahi bhej sakte.' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('student_chat_requests')
    .select('*')
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipient.id}),and(requester_id.eq.${recipient.id},recipient_id.eq.${user.id})`)
    .neq('status', 'declined')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: existing.status === 'approved' ? 'Chat already approved hai.' : 'Request already pending hai.' }, { status: 409 });
  }

  const { data, error } = await admin
    .from('student_chat_requests')
    .insert({ requester_id: user.id, recipient_id: recipient.id, status: 'pending' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Request send nahi hui. Migration 011 check karein.' }, { status: 500 });

  await admin.from('notifications').insert({
    user_id: recipient.id,
    type: 'SOCIAL',
    title: 'New study buddy request',
    message: 'Ek student ne aapko chat request bheji hai.',
    link: '/student-chat',
    is_read: false,
  });

  return NextResponse.json({ request: (await decorateRequests(admin, [data]))[0] });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { requestId, status } = await req.json();
  if (!requestId || (status !== 'approved' && status !== 'declined')) {
    return NextResponse.json({ error: 'Valid requestId/status required hai' }, { status: 400 });
  }

  const admin = await createAdminClient() as any;
  const { data: existing } = await admin
    .from('student_chat_requests')
    .select('*')
    .eq('id', requestId)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Pending request nahi mili.' }, { status: 404 });

  const { data, error } = await admin
    .from('student_chat_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Request update nahi hui.' }, { status: 500 });

  await admin.from('notifications').insert({
    user_id: existing.requester_id,
    type: 'SOCIAL',
    title: status === 'approved' ? 'Study buddy request approved' : 'Study buddy request declined',
    message: status === 'approved' ? 'Ab aap dono chat kar sakte hain. Messaging Pro/Elite par unlock hoti hai.' : 'Aapki request decline ho gayi.',
    link: '/student-chat',
    is_read: false,
  });

  return NextResponse.json({ request: (await decorateRequests(admin, [data]))[0] });
}
