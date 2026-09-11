import type { SupabaseClient } from '@supabase/supabase-js';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
import type { CallIdentity } from './types';

/**
 * Resolves the caller's own {institutionType, organizationId, role} for the voice-calling
 * feature — school membership first, then college, same priority order as
 * resolveMembershipRedirect(). Returns null for a plain consumer account (no institution
 * membership), which is the correct "calling doesn't apply to you" signal — every UI piece that
 * renders a call button/provider treats null as "render nothing".
 */
export async function getCallIdentity(supabase: SupabaseClient, userId: string): Promise<CallIdentity | null> {
  const schoolContext = await getSchoolContext(supabase, userId);
  const collegeContext = schoolContext ? null : await getCollegeContext(supabase, userId);
  const base = schoolContext
    ? { institutionType: 'school' as const, organizationId: schoolContext.organization.id, role: schoolContext.membership.member_role }
    : collegeContext
      ? { institutionType: 'college' as const, organizationId: collegeContext.organization.id, role: collegeContext.membership.member_role }
      : null;
  if (!base) return null;

  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('full_name, avatar_url').eq('id', userId).maybeSingle();

  return {
    userId,
    ...base,
    fullName: profile?.full_name || null,
    avatarUrl: profile?.avatar_url || null,
  };
}
