import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLiveSessionForViewer } from '@/lib/live-classes/access';

export const runtime = 'nodejs';

/**
 * Sends one live-chat message into a class's live session. Every enrolled
 * student and the teacher see every message (a shared class chat, not a
 * private DM to the teacher) — the client subscribes to this table's Postgres
 * changes via Supabase Realtime rather than polling this route.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || '');
  const message = String(body?.message || '').trim().slice(0, 500);
  if (!sessionId || !message) return NextResponse.json({ error: 'sessionId and message are required.' }, { status: 400 });

  const context = await getLiveSessionForViewer(supabase, sessionId, user.id);
  if (!context) return NextResponse.json({ error: 'You are not part of this class.' }, { status: 403 });
  if (context.session.status !== 'live') {
    return NextResponse.json({ error: 'This class has ended.' }, { status: 410 });
  }

  const db = supabase as any;
  const { error } = await db.from('class_live_chat_messages').insert({
    session_id: sessionId,
    sender_id: user.id,
    sender_role: context.role,
    message,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ status: 'success' });
}
