import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ status: 'error', error: 'Code required hai' }, { status: 400 });

    const code = String(inviteCode).trim().toUpperCase();
    const admin = await createAdminClient();
    const { data: invite } = await (admin.from('parent_student_links') as any)
      .select('id, parent_id, student_id, status, invite_code, invite_expires_at')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) return NextResponse.json({ status: 'error', error: 'Invalid invite code' }, { status: 404 });
    if (invite.parent_id === user.id) return NextResponse.json({ status: 'error', error: 'Apna khud ka code use nahi kar sakte' }, { status: 400 });
    if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ status: 'error', error: 'Invite code expire ho gaya' }, { status: 410 });
    }

    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();

    const { error } = await (admin.from('parent_student_links') as any)
      .update({
        student_id: user.id,
        status: 'approved',
        linked_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (error) throw error;

    await admin.from('notifications').insert({
      user_id: invite.parent_id,
      type: 'SOCIAL',
      title: 'Student linked',
      message: `${profile?.full_name || 'Student'} ne parent invite accept kar liya.`,
      link: '/parent',
      is_read: false,
    });

    return NextResponse.json({ status: 'success', message: 'Parent account se successfully link ho gaya!' });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ status: 'error', error: 'Invite accept nahi ho saka' }, { status: 500 });
  }
}
