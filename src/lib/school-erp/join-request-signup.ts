import { notifyOrgAdminsOfNewRequest } from './join-request-notify';
import type { SchoolJoinRole } from './types';

/**
 * Called from src/app/api/auth/ensure-profile/route.ts and
 * src/app/api/auth/callback/route.ts once a profile row exists for a user
 * who picked "Institutional" during signup (see signup_institution_id /
 * signup_role_requested in the signUp() metadata sent by RegisterForm).
 *
 * Deliberately idempotent: ensure-profile can run more than once for the
 * same user (e.g. a retried request), so a duplicate insert (unique
 * (requester_id, organization_id), or the "one active request" partial
 * index) is treated as success, not an error.
 */
export async function createInstitutionalJoinRequestFromSignup(
  db: any,
  userId: string,
  organizationId: string,
  roleRequested: SchoolJoinRole,
  requesterName: string
): Promise<{ created: boolean }> {
  // Nothing to do if this user already has any request on record — signup
  // only ever fires this once per account, but the auth routes can retry.
  const { data: existing } = await db
    .from('school_join_requests')
    .select('id')
    .eq('requester_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (existing) return { created: false };

  const { error } = await db.from('school_join_requests').insert({
    requester_id: userId,
    organization_id: organizationId,
    role_requested: roleRequested,
  });
  if (error) {
    // 23505 = unique violation (already has an active request elsewhere,
    // or a race with another retry of the same insert) — not fatal, the
    // account itself was still created successfully.
    if (error.code !== '23505') {
      console.error('[join-request-signup] Could not create join request:', error);
    }
    return { created: false };
  }

  await notifyOrgAdminsOfNewRequest(organizationId, requesterName, roleRequested);
  return { created: true };
}
