import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLiveSessionForViewer } from '@/lib/live-classes/access';

export const runtime = 'nodejs';

/** Student-only: raise or lower their own hand for a live session. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || '');
  const raise = body?.raise !== false;
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });

  const context = await getLiveSessionForViewer(supabase, sessionId, user.id);
  if (!context || context.role !== 'student') {
    return NextResponse.json({ error: 'Only enrolled students can raise a hand.' }, { status: 403 });
  }
  if (context.session.status !== 'live') return NextResponse.json({ error: 'This class has ended.' }, { status: 410 });

  const db = supabase as any;
  const { error } = raise
    ? await db
        .from('class_live_hand_raises')
        .upsert(
          { session_id: sessionId, student_id: user.id, status: 'raised', updated_at: new Date().toISOString() },
          { onConflict: 'session_id,student_id' }
        )
    : await db
        .from('class_live_hand_raises')
        .update({ status: 'lowered', updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('student_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ status: 'success' });
}
