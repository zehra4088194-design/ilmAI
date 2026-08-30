import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLiveSessionForViewer } from '@/lib/live-classes/access';
import { setStudentMicPermission } from '@/lib/live-classes/livekit';

export const runtime = 'nodejs';

/** Teacher-only: grants or revokes one student's microphone in their own live session. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || '');
  const studentId = String(body?.studentId || '');
  const grant = Boolean(body?.grant);
  if (!sessionId || !studentId) return NextResponse.json({ error: 'sessionId and studentId are required.' }, { status: 400 });

  const context = await getLiveSessionForViewer(supabase, sessionId, user.id);
  if (!context || context.role !== 'teacher') {
    return NextResponse.json({ error: "Only this class's teacher can grant the mic." }, { status: 403 });
  }
  if (context.session.status !== 'live') return NextResponse.json({ error: 'This class has ended.' }, { status: 410 });

  try {
    await setStudentMicPermission(context.session.livekit_room_name, studentId, grant);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update the microphone.' }, { status: 502 });
  }

  const db = supabase as any;
  await db
    .from('class_live_hand_raises')
    .update({ status: grant ? 'granted' : 'lowered', updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('student_id', studentId);

  return NextResponse.json({ status: 'success' });
}
