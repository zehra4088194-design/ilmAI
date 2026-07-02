import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ status: 'error', error: 'Code required hai' }, { status: 400 });

    const code = inviteCode.toUpperCase();
    const { data: invite } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'SYSTEM')
      .like('title', `PARENT_INVITE:${code}%`)
      .eq('is_read', false)
      .single();

    if (!invite) return NextResponse.json({ status: 'error', error: 'Invalid ya expired invite code' }, { status: 404 });

    const parentId = invite.message;
    if (parentId === user.id) return NextResponse.json({ status: 'error', error: 'Apna khud ka code use nahi kar sakte' }, { status: 400 });

    const { error } = await supabase.from('parent_student_links').upsert({
      id: nanoid(),
      parent_id: parentId,
      student_id: user.id,
      status: 'approved',
      linked_at: new Date().toISOString(),
    }, { onConflict: 'parent_id,student_id' });

    if (error) throw error;

    await supabase.from('notifications').update({ is_read: true }).eq('id', invite.id);

    return NextResponse.json({ status: 'success', message: 'Parent account se successfully link ho gaya!' });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ status: 'error', error: 'Invite accept nahi ho saka' }, { status: 500 });
  }
}
