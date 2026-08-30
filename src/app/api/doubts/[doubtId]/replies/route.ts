import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { moderatePeerRepliesIfNeeded } from '@/lib/doubts/moderation';

/**
 * Phase 3a — a student answering another student's posted doubt. Reuses the existing
 * doubt_replies table (is_peer_reply distinguishes this from the AI-teacher reply already
 * inserted by POST /api/doubts) rather than a parallel table.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ doubtId: string }> }) {
  const { doubtId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ status: 'error', error: 'Write an answer first.' }, { status: 400 });

  const db = supabase as any;
  const { data: doubt } = await db
    .from('doubts')
    .select('id, student_id, peer_reply_count, moderation_warning_count, moderation_last_checked_count, moderation_blocked_until')
    .eq('id', doubtId)
    .maybeSingle();
  if (!doubt) return NextResponse.json({ status: 'error', error: 'Question not found.' }, { status: 404 });
  if (doubt.student_id === user.id) {
    return NextResponse.json({ status: 'error', error: 'You cannot answer your own question.' }, { status: 400 });
  }
  if (doubt.moderation_blocked_until && new Date(doubt.moderation_blocked_until).getTime() > Date.now()) {
    return NextResponse.json(
      { status: 'error', error: 'Peer answers on this question are temporarily blocked by moderation.' },
      { status: 403 }
    );
  }

  const { data: reply, error } = await db
    .from('doubt_replies')
    .insert({
      id: nanoid(),
      doubt_id: doubtId,
      teacher_id: user.id,
      body: body.trim().slice(0, 4000),
      is_peer_reply: true,
      is_accepted: false,
    })
    .select('*, profiles(full_name, avatar_url)')
    .single();
  if (error) return NextResponse.json({ status: 'error', error: 'The answer could not be posted.' }, { status: 500 });

  const nextCount = Number(doubt.peer_reply_count || 0) + 1;
  const admin = createServiceClient() as any;
  await admin.from('doubts').update({ peer_reply_count: nextCount }).eq('id', doubtId);

  const moderation = await moderatePeerRepliesIfNeeded(admin, { ...doubt, peer_reply_count: nextCount });

  return NextResponse.json({ status: 'success', data: reply, moderation });
}
