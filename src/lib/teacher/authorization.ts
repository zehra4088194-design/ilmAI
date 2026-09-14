import type { SupabaseClient } from '@supabase/supabase-js';

const INSTITUTION_TEACHER_ROLES = ['owner', 'admin', 'teacher'];

/** A teacher for Test Paper Studio can be a global teacher/admin or an active school/college teacher membership. */
export async function isTeacherAuthorized(supabase: SupabaseClient, userId: string) {
  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile && ['teacher', 'admin'].includes(String(profile.role))) return true;

  const [{ data: schoolMembership }, { data: collegeMembership }] = await Promise.all([
    db.from('school_memberships').select('id').eq('profile_id', userId).eq('status', 'active').in('member_role', INSTITUTION_TEACHER_ROLES).limit(1).maybeSingle(),
    db.from('college_memberships').select('id').eq('profile_id', userId).eq('status', 'active').in('member_role', INSTITUTION_TEACHER_ROLES).limit(1).maybeSingle(),
  ]);
  return Boolean(schoolMembership || collegeMembership);
}
