import type { SupabaseClient } from '@supabase/supabase-js';

export type InstitutionBranding = {
  name: string;
  logoUrl: string | null;
};

/**
 * White-labeling resolver (CLAUDE_CODE_MASTER_PROMPT.md point 7 / Part 4.3): a student added by a
 * school/college sees that institution's logo + "<Name> · Ilm AI" instead of the plain Ilm AI mark.
 * Non-enrolled consumer users get `null` back and the caller falls back to the default brand.
 *
 * Deliberately a lightweight direct query, not getSchoolContext()/getCollegeContext() — this runs
 * on every dashboard page load just to pick a logo, so it skips those functions' RPC call for
 * enabled-module resolution, which branding doesn't need.
 */
export async function resolveInstitutionBranding(
  supabase: SupabaseClient,
  userId: string
): Promise<InstitutionBranding | null> {
  const db = supabase as any;

  const { data: schoolRows } = await db
    .from('school_memberships')
    .select('school_organizations(name, logo_url, status)')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .limit(1);
  const schoolOrg = Array.isArray(schoolRows) && schoolRows.length
    ? (Array.isArray(schoolRows[0].school_organizations) ? schoolRows[0].school_organizations[0] : schoolRows[0].school_organizations)
    : null;
  if (schoolOrg && schoolOrg.status !== 'suspended' && schoolOrg.status !== 'archived') {
    return { name: schoolOrg.name, logoUrl: schoolOrg.logo_url || null };
  }

  const { data: collegeRows } = await db
    .from('college_memberships')
    .select('college_organizations(name, logo_url, status)')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .limit(1);
  const collegeOrg = Array.isArray(collegeRows) && collegeRows.length
    ? (Array.isArray(collegeRows[0].college_organizations) ? collegeRows[0].college_organizations[0] : collegeRows[0].college_organizations)
    : null;
  if (collegeOrg && collegeOrg.status !== 'suspended' && collegeOrg.status !== 'archived') {
    return { name: collegeOrg.name, logoUrl: collegeOrg.logo_url || null };
  }

  return null;
}
