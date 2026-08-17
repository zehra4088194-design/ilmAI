import type { SupabaseClient } from '@supabase/supabase-js';

export type QuranGroupSummary = {
  id: string;
  name: string;
  session_time: string;
  days_of_week: number[];
  livekit_room_name: string;
  status: string;
  max_students: number;
  member_count: number;
};

/** Null when the signed-in user is not an active Quran teacher. */
export async function getQuranTeacherContext(supabase: SupabaseClient, userId: string) {
  const db = supabase as any;
  const { data: teacher } = await db
    .from('quran_teachers')
    .select('id, status')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (!teacher) return null;

  const { data: groups } = await db
    .from('quran_groups')
    .select('id, name, session_time, days_of_week, livekit_room_name, status, max_students, quran_group_members(count)')
    .eq('teacher_id', teacher.id)
    .order('session_time');

  const summaries: QuranGroupSummary[] = (groups || []).map((group: any) => ({
    id: group.id,
    name: group.name,
    session_time: group.session_time,
    days_of_week: group.days_of_week || [],
    livekit_room_name: group.livekit_room_name,
    status: group.status,
    max_students: group.max_students,
    member_count: Array.isArray(group.quran_group_members) ? group.quran_group_members[0]?.count || 0 : 0,
  }));

  return { teacherId: teacher.id as string, groups: summaries };
}

export type QuranStudentGroup = {
  id: string;
  name: string;
  session_time: string;
  days_of_week: number[];
  livekit_room_name: string;
  status: string;
  teacher_name: string;
};

/** Every active group the signed-in user belongs to as a student. */
export async function getQuranStudentGroups(supabase: SupabaseClient, userId: string): Promise<QuranStudentGroup[]> {
  const db = supabase as any;
  const { data: memberships } = await db
    .from('quran_group_members')
    .select(
      'group_id, quran_groups(id, name, session_time, days_of_week, livekit_room_name, status, quran_teachers(profiles(full_name)))'
    )
    .eq('student_id', userId)
    .eq('status', 'active');

  return (memberships || [])
    .map((membership: any) => {
      const group = Array.isArray(membership.quran_groups) ? membership.quran_groups[0] : membership.quran_groups;
      if (!group) return null;
      const teacher = Array.isArray(group.quran_teachers) ? group.quran_teachers[0] : group.quran_teachers;
      const teacherProfile = teacher ? (Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles) : null;
      return {
        id: group.id,
        name: group.name,
        session_time: group.session_time,
        days_of_week: group.days_of_week || [],
        livekit_room_name: group.livekit_room_name,
        status: group.status,
        teacher_name: teacherProfile?.full_name || 'Teacher',
      } as QuranStudentGroup;
    })
    .filter(Boolean) as QuranStudentGroup[];
}

/** Resolves the teacher_id that owns a given room, for the mute API's authorization check. */
export async function getGroupByRoomName(supabase: SupabaseClient, roomName: string) {
  const db = supabase as any;
  const { data } = await db
    .from('quran_groups')
    .select('id, teacher_id, quran_teachers(profile_id)')
    .eq('livekit_room_name', roomName)
    .maybeSingle();
  if (!data) return null;
  const teacher = Array.isArray(data.quran_teachers) ? data.quran_teachers[0] : data.quran_teachers;
  return { groupId: data.id as string, teacherProfileId: teacher?.profile_id as string | undefined };
}
