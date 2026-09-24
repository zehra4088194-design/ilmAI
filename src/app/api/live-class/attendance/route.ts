import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Student-side join/leave attendance log for a live class session. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || '');
  const event = body?.event === 'leave' ? 'leave' : 'join';
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });

  const db = supabase as any;
  if (event === 'join') {
    const { error } = await db
      .from('class_live_attendance')
      .upsert(
        { session_id: sessionId, student_id: user.id, joined_at: new Date().toISOString() },
        { onConflict: 'session_id,student_id' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await db
      .from('class_live_attendance')
      .update({ left_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('student_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ status: 'success' });
}
