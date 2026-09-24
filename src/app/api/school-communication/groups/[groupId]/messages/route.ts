import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

async function getMember(groupId: string, userId: string) {
  const admin = await createAdminClient();
  const db = admin as any;
  const { data } = await db
    .from('school_communication_group_members')
    .select('group_id, profile_id, member_role')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .maybeSingle();
  return { db, member: data };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { db, member } = await getMember(groupId, user.id);
  if (!member) return NextResponse.json({ error: 'You are not a member of this group.' }, { status: 403 });
  const { data, error } = await db
    .from('school_communication_group_messages')
    .select('id, group_id, sender_id, content, created_at, profiles(id, full_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) return NextResponse.json({ error: 'Group messages could not be loaded.' }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { db, member } = await getMember(groupId, user.id);
  if (!member) return NextResponse.json({ error: 'You are not a member of this group.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim().slice(0, 4000);
  if (!content) return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });

  const { data: message, error } = await db
    .from('school_communication_group_messages')
    .insert({ group_id: groupId, sender_id: user.id, content })
    .select('id, group_id, sender_id, content, created_at, profiles(id, full_name, avatar_url)')
    .single();
  if (error) return NextResponse.json({ error: error.message || 'Message could not be sent.' }, { status: 500 });
  return NextResponse.json({ message });
}
