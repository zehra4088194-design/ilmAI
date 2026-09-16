import type { SupabaseClient } from '@supabase/supabase-js';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
import type { CallIdentity } from './types';

export async function getCallIdentity(supabase: SupabaseClient, userId: string): Promise<CallIdentity | null> {
  const schoolContext = await getSchoolContext(supabase, userId);
  const collegeContext = schoolContext ? null : await getCollegeContext(supabase, userId);

  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('full_name, avatar_url').eq('id', userId).maybeSingle();
  if (!profile) return null;

  if (schoolContext) {
    return {
      userId,
      institutionType: 'school',
      organizationId: schoolContext.organization.id,
      role: schoolContext.membership.member_role,
      fullName: profile.full_name || null,
      avatarUrl: profile.avatar_url || null,
    };
  }

  if (collegeContext) {
    return {
      userId,
      institutionType: 'college',
      organizationId: collegeContext.organization.id,
      role: collegeContext.membership.member_role,
      fullName: profile.full_name || null,
      avatarUrl: profile.avatar_url || null,
    };
  }

  // Plain ilm AI account: still eligible for the same voice-calling provider.
  return {
    userId,
    institutionType: 'consumer',
    organizationId: 'consumer',
    role: 'student',
    fullName: profile.full_name || null,
    avatarUrl: profile.avatar_url || null,
  };
}
