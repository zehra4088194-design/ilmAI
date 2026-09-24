'use server';

// Shared low-level helper for admin/principal-driven "add a member by email before
// they've signed up" flows (school/college owner provisioning, staff/teacher add).
// Mirrors resolveMembershipRedirect.ts's role as the one deliberately shared
// low-level auth helper — everything above this (school-erp vs college-erp actions)
// stays separate per CLAUDE_CODE_MASTER_PROMPT.md's "data and portals stay separate"
// instruction; only this generic Supabase-invite plumbing is shared.
//
// Server Actions must be async functions — the plain, synchronous role-mapping helper that used
// to live here now lives in ./mapInstitutionRoleToProfileRole.ts. Callers should import
// `mapInstitutionRoleToProfileRole` from that file directly, not from this one — re-exporting a
// non-async function's value (as opposed to just its type) from a 'use server' file trips the
// same "Server Actions must be async" build error this split was meant to fix.
import { createAdminClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import type { InvitableProfileRole } from './mapInstitutionRoleToProfileRole';

export type { InvitableProfileRole } from './mapInstitutionRoleToProfileRole';

export type InviteOrFindProfileResult = {
  id: string;
  invited: boolean;
};

/**
 * Looks up a profile by email. If none exists yet, invites the email via Supabase
 * Auth (creates the auth.users row + sends a "set your password" email reusing the
 * exact same recovery flow as forgot-password: redirectTo -> /api/auth/recovery ->
 * exchangeCodeForSession -> /reset-password), then creates a minimal profiles row so
 * the caller can immediately insert a school_memberships/college_memberships row
 * against it (profiles.id is a hard FK target on those tables).
 *
 * The invited person never has to "sign up" separately — they click the emailed
 * link, set a password, and their account (with the membership already attached)
 * is ready. Their first real login runs through post-login-destination /
 * resolveMembershipRedirect exactly like any other member.
 */
export async function inviteOrFindProfileId(
  email: string,
  opts: { fullNameHint?: string; profileRole: InvitableProfileRole }
): Promise<InviteOrFindProfileResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const admin = (await createAdminClient()) as any;

  const { data: existing } = await admin.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle();
  if (existing) return { id: existing.id, invited: false };

  const redirectTo = `${getSiteUrl()}/api/auth/recovery`;
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
  });
  if (inviteError || !inviteData?.user) {
    throw new Error(
      inviteError?.message || `Could not send an invite to ${normalizedEmail}. Check the email address and try again.`
    );
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: inviteData.user.id,
    email: normalizedEmail,
    full_name: opts.fullNameHint?.trim() || normalizedEmail.split('@')[0],
    role: opts.profileRole,
  });
  if (profileError) {
    // Race: the invited user may have already clicked the link and completed
    // signup (which creates its own profile row) between our invite call and this
    // insert. Treat "the profile already exists now" as success, not a failure.
    const { data: raceProfile } = await admin.from('profiles').select('id').eq('id', inviteData.user.id).maybeSingle();
    if (!raceProfile) throw new Error(profileError.message);
  }

  return { id: inviteData.user.id, invited: true };
}
