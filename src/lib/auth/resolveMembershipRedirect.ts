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
 * Single shared low-level resolver used by both the school and college login-redirect flows.
 * Institution staff/administrative members are routed to their institution portals, while
 * institution students intentionally remain on the normal consumer student dashboard. The
 * dashboard shell independently resolves the institution branding for those students.
 */
export async function resolveMembershipRedirect(
  supabase: SupabaseClient,
  userId: string,
  requestedRedirect?: string | null
): Promise<MembershipRedirectResult> {
  const schoolContext = await getSchoolContext(supabase, userId);
  if (schoolContext && schoolContext.membership.member_role !== 'student') {
    const home = schoolAdminHomeForRole(schoolContext.membership.member_role);
    return {
      destination: isDeepLinkWithin(requestedRedirect, SCHOOL_PORTAL_PREFIXES) ? requestedRedirect : home,
      institutionType: 'school',
    };
  }

  const collegeContext = await getCollegeContext(supabase, userId);
  if (collegeContext && collegeContext.membership.member_role !== 'student') {
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
