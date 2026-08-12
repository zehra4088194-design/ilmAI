import type { SupabaseClient } from '@supabase/supabase-js';
import { getSchoolContext, schoolAdminHomeForRole } from '@/lib/school-erp/access';
import { getCollegeContext, collegeAdminHomeForRole } from '@/lib/college-erp/access';

export type MembershipRedirectResult = {
  destination: string;
  institutionType: 'school' | 'college' | null;
};

/**
 * Single shared low-level resolver used by both the school and college login-redirect flows
 * (CLAUDE_CODE_MASTER_PROMPT.md Phase 2, §3.3: "a single shared low-level helper... rather than
 * fully copy-pasting SQL — code reuse is fine, but the data and portals themselves stay separate").
 *
 * Priority order (per the master prompt): school membership first, then college membership,
 * then the normal consumer flow. A profile with active memberships in BOTH a school and a college
 * lands on the school portal — that ambiguity is not resolved by this function; see
 * docs/SCHOOL_COLLEGE_SEPARATION_TODO.md §5 for the open "at most one role" decision.
 */
export async function resolveMembershipRedirect(
  supabase: SupabaseClient,
  userId: string
): Promise<MembershipRedirectResult> {
  const schoolContext = await getSchoolContext(supabase, userId);
  if (schoolContext) {
    return {
      destination: schoolAdminHomeForRole(schoolContext.membership.member_role),
      institutionType: 'school',
    };
  }

  const collegeContext = await getCollegeContext(supabase, userId);
  if (collegeContext) {
    return {
      destination: collegeAdminHomeForRole(collegeContext.membership.member_role),
      institutionType: 'college',
    };
  }

  return { destination: '/dashboard', institutionType: null };
}
