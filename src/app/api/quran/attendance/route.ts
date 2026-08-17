import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Student-side join/leave attendance log for a Quran group's session today. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const groupId = String(body?.groupId || '');
  const event = body?.event === 'leave' ? 'leave' : 'join';
  if (!groupId) return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });

  const db = supabase as any;
  if (event === 'join') {
    const { error } = await db
      .from('quran_attendance')
      .upsert(
        { group_id: groupId, student_id: user.id, session_date: new Date().toISOString().slice(0, 10), joined_at: new Date().toISOString() },
        { onConflict: 'group_id,student_id,session_date' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await db
      .from('quran_attendance')
      .update({ left_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('student_id', user.id)
      .eq('session_date', new Date().toISOString().slice(0, 10));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ status: 'success' });
}
