import type { SupabaseClient } from '@supabase/supabase-js';

// A "teacher" for Test Paper Studio purposes is either the legacy global
// profiles.role flag, or a school-erp membership added by a principal
// (school_memberships.member_role in owner/admin/teacher).
const SCHOOL_TEACHER_ROLES = ['owner', 'admin', 'teacher'];

export async function isTeacherAuthorized(supabase: SupabaseClient, userId: string) {
  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile && ['teacher', 'admin'].includes(String(profile.role))) return true;

  const { data: membership } = await db
    .from('school_memberships')
    .select('id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .in('member_role', SCHOOL_TEACHER_ROLES)
    .limit(1)
    .maybeSingle();
  return Boolean(membership);
}
