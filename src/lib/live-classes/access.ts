import type { SupabaseClient } from '@supabase/supabase-js';

export type ClassLiveSession = {
  id: string;
  class_id: string;
  title: string;
  status: 'live' | 'ended';
  livekit_room_name: string;
  started_at: string;
};

/** The class's currently-live session, if any (there's at most one per class at a time). */
export async function getActiveLiveSession(supabase: SupabaseClient, classId: string): Promise<ClassLiveSession | null> {
  const db = supabase as any;
  const { data } = await db
    .from('class_live_sessions')
    .select('id, class_id, title, status, livekit_room_name, started_at')
    .eq('class_id', classId)
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

/** Resolves a session plus enough of its parent class to authorize a viewer. */
export async function getLiveSessionForViewer(supabase: SupabaseClient, sessionId: string, userId: string) {
  const db = supabase as any;
  const { data: session } = await db
    .from('class_live_sessions')
    .select('id, class_id, title, status, livekit_room_name, started_at, teacher_classes(id, name, teacher_id)')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return null;
  const klass = Array.isArray(session.teacher_classes) ? session.teacher_classes[0] : session.teacher_classes;
  if (!klass) return null;

  if (klass.teacher_id === userId) {
    return { session, role: 'teacher' as const, className: klass.name as string };
  }
  const { data: enrollment } = await db
    .from('class_enrollments')
    .select('id')
    .eq('class_id', klass.id)
    .eq('student_id', userId)
    .maybeSingle();
  if (!enrollment) return null;
  return { session, role: 'student' as const, className: klass.name as string };
}
