import type { SupabaseClient } from '@supabase/supabase-js';

export interface QuranAttendanceSummary {
  thisMonthCount: number;
  attendedToday: boolean;
  recentDates: string[];
}

/** Shared attendance-summary shape for a single student across their Quran groups —
 * used by both the kid's own /kids/quran page and the parent-facing Quran bridge, so
 * the two stay consistent. quran_attendance has no status column; a row's presence
 * for a session_date IS the "present" signal (recorded on join). */
export async function getQuranAttendanceSummary(
  admin: SupabaseClient,
  studentId: string,
  groupIds: string[]
): Promise<QuranAttendanceSummary> {
  if (!groupIds.length) return { thisMonthCount: 0, attendedToday: false, recentDates: [] };
  const db = admin as any;
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await db
    .from('quran_attendance')
    .select('session_date')
    .eq('student_id', studentId)
    .in('group_id', groupIds)
    .gte('session_date', monthStartStr)
    .order('session_date', { ascending: false });

  const dates = ((rows || []) as any[]).map((row) => row.session_date as string);
  return {
    thisMonthCount: dates.length,
    attendedToday: dates.includes(today),
    recentDates: dates.slice(0, 5),
  };
}
