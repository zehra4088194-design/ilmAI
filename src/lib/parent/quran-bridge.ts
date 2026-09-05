import { getQuranAttendanceSummary } from '@/lib/quran/attendance-summary';

export interface FamilyQuranEntry {
  groupName: string;
  teacherName: string;
  sessionTime: string;
  daysOfWeek: number[];
  currentLesson: string | null;
  thisMonthAttendance: number;
  attendedToday: boolean;
  practiceDoneToday: boolean;
}

export type FamilyQuranMap = Record<string, FamilyQuranEntry | null>;

/** Bridges parent_student_links to quran_group_members/quran_attendance/quran_daily_practice
 * for each linked child — surfaced on the parent's existing Attendance tab (see
 * ParentDashboardClient) so Quran Class progress reaches parents without a separate portal. */
export async function getFamilyQuranData(admin: any, studentIds: string[]): Promise<FamilyQuranMap> {
  const result: FamilyQuranMap = {};
  for (const studentId of studentIds) result[studentId] = null;
  if (!studentIds.length) return result;

  const { data: memberships } = await admin
    .from('quran_group_members')
    .select(
      'student_id, group_id, quran_groups(id, name, session_time, days_of_week, current_lesson, quran_teachers(profiles(full_name)))'
    )
    .in('student_id', studentIds)
    .eq('status', 'active');

  const today = new Date().toISOString().slice(0, 10);

  await Promise.all(
    ((memberships || []) as any[]).map(async (membership) => {
      const group = Array.isArray(membership.quran_groups) ? membership.quran_groups[0] : membership.quran_groups;
      if (!group) return;
      const teacher = Array.isArray(group.quran_teachers) ? group.quran_teachers[0] : group.quran_teachers;
      const teacherProfile = teacher ? (Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles) : null;

      const [attendance, { data: practiceRow }] = await Promise.all([
        getQuranAttendanceSummary(admin, membership.student_id, [group.id]),
        admin
          .from('quran_daily_practice')
          .select('completed')
          .eq('student_id', membership.student_id)
          .eq('practice_date', today)
          .maybeSingle(),
      ]);

      result[membership.student_id] = {
        groupName: group.name,
        teacherName: teacherProfile?.full_name || 'Teacher',
        sessionTime: group.session_time,
        daysOfWeek: group.days_of_week || [],
        currentLesson: group.current_lesson || null,
        thisMonthAttendance: attendance.thisMonthCount,
        attendedToday: attendance.attendedToday,
        practiceDoneToday: !!practiceRow?.completed,
      };
    })
  );

  return result;
}
