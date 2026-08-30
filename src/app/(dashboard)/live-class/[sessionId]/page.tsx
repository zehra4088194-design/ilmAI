import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLiveSessionForViewer } from '@/lib/live-classes/access';
import { endLiveSession } from '../../teacher/actions';
import { ClassLiveRoom } from '@/components/features/live-classes/ClassLiveRoom';

export const metadata = { title: 'Live Class | ilm AI' };

export default async function LiveClassPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=%2Flive-class%2F${sessionId}`);

  const context = await getLiveSessionForViewer(supabase, sessionId, user.id);
  if (!context) redirect('/dashboard');

  const db = supabase as any;
  const { data: history } = await db
    .from('class_live_chat_messages')
    .select('id, sender_id, sender_role, message, created_at, profiles(full_name)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);

  const initialMessages = (history || []).map((row: any) => ({
    id: row.id,
    sender_id: row.sender_id,
    sender_role: row.sender_role,
    message: row.message,
    created_at: row.created_at,
    sender_name: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.full_name,
  }));

  const { data: handRows } = await db
    .from('class_live_hand_raises')
    .select('student_id, status, profiles(full_name)')
    .eq('session_id', sessionId)
    .in('status', ['raised', 'granted']);
  const initialHandRaises = (handRows || []).map((row: any) => ({
    studentId: row.student_id,
    status: row.status,
    name: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.full_name,
  }));

  return (
    <ClassLiveRoom
      sessionId={sessionId}
      classId={context.session.class_id}
      className={context.className}
      title={context.session.title}
      role={context.role}
      initialMessages={initialMessages}
      initialHandRaises={initialHandRaises}
      onEnd={endLiveSession}
    />
  );
}
