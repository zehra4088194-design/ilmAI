import type { SupabaseClient } from '@supabase/supabase-js';
import { getSchoolContext, schoolAdminHomeForRole } from '@/lib/school-erp/access';
import { getCollegeContext, collegeAdminHomeForRole } from '@/lib/college-erp/access';
import { resolveKidsDashboardEligibility } from '@/lib/kids/resolveEligibility';

export type MembershipRedirectResult = {
  destination: string;
  institutionType: 'school' | 'college' | null;
};

const SCHOOL_PORTAL_PREFIXES = ['/school-admin', '/school'];
const COLLEGE_PORTAL_PREFIXES = ['/college-admin', '/college'];

function isDeepLinkWithin(path: string | null | undefined, prefixes: string[]): path is string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false;
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Single shared low-level resolver used by both the school and college login-redirect flows
 * (CLAUDE_CODE_MASTER_PROMPT.md Phase 2, §3.3: "a single shared low-level helper... rather than
 * fully copy-pasting SQL — code reuse is fine, but the data and portals themselves stay separate").
 *
 * Priority order (per the master prompt): school membership first, then college membership,
 * then the normal consumer flow. A profile with active memberships in BOTH a school and a college
 * lands on the school portal — that ambiguity is not resolved by this function; see
 * docs/SCHOOL_COLLEGE_SEPARATION_TODO.md §5 for the open "at most one role" decision.
 *
 * `requestedRedirect` (optional) is whatever `?redirect=` the login/callback flow was carrying —
 * e.g. because middleware bounced an unauthenticated visit to a protected page through
 * `/login?redirect=<path>`. It is only honored when it's a genuine deep link into the resolved
 * institution's OWN portal (so "I was trying to reach /school-admin/people" still works); any other
 * value (most commonly the generic `/dashboard` fallback nearly every login flow defaults to) is
 * ignored in favor of the institution home. This is the fix for a real bug: a school/college member
 * logging in through a link that carried `?redirect=/dashboard` used to always land on the generic
 * consumer dashboard instead of their portal, because callers were skipping this resolver entirely
 * whenever an explicit redirect was present.
 */
export async function resolveMembershipRedirect(
  supabase: SupabaseClient,
  userId: string,
  requestedRedirect?: string | null
): Promise<MembershipRedirectResult> {
  const schoolContext = await getSchoolContext(supabase, userId);
  if (schoolContext) {
    const home = schoolAdminHomeForRole(schoolContext.membership.member_role);
    return {
      destination: isDeepLinkWithin(requestedRedirect, SCHOOL_PORTAL_PREFIXES) ? requestedRedirect : home,
      institutionType: 'school',
    };
  }

  const collegeContext = await getCollegeContext(supabase, userId);
  if (collegeContext) {
    const home = collegeAdminHomeForRole(collegeContext.membership.member_role);
    return {
      destination: isDeepLinkWithin(requestedRedirect, COLLEGE_PORTAL_PREFIXES) ? requestedRedirect : home,
      institutionType: 'college',
    };
  }

  const hasSpecificRedirect =
    requestedRedirect &&
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    requestedRedirect !== '/dashboard';
  if (hasSpecificRedirect) {
    return { destination: requestedRedirect!, institutionType: null };
  }

  // No institution membership and no specific deep link (or just the generic
  // /dashboard fallback most login flows default to) — check whether this is a
  // young-child account (under 8, via profiles.date_of_birth, or a school
  // enrollment's grade_level as a fallback signal) and route to the dedicated
  // Kids Dashboard instead of the regular consumer dashboard.
  const kids = await resolveKidsDashboardEligibility(supabase, userId);
  if (kids.eligible) return { destination: '/kids', institutionType: null };

  return { destination: '/dashboard', institutionType: null };
}
