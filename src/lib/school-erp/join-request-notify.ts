import type { SchoolJoinRole } from './types';
import { createAdminClient } from '@/lib/supabase/server';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';

/**
 * Shared by src/lib/school-erp/join-requests.ts (self-service action) and
 * join-request-signup.ts (institutional signup, called from the auth
 * routes) so both paths notify the org's owner/admin the same way.
 *
 * Always uses its own service-role client, never the caller's — the person
 * filing the request is (by definition) not yet a member of the target
 * organization, so their session can't read other members' school_memberships
 * rows or insert notifications for them under RLS. Mirrors how every other
 * cross-user notification in this codebase (parent<->student messages,
 * student chat requests) goes through createAdminClient(), never the
 * requester's own session client.
 */
export async function notifyOrgAdminsOfNewRequest(organizationId: string, requesterName: string, role: SchoolJoinRole) {
  const db = (await createAdminClient()) as any;
  const { data: admins } = await db
    .from('school_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('member_role', ['owner', 'admin']);
  const recipients = (admins ?? []) as Array<{ profile_id: string }>;
  if (!recipients.length) return;

  await createNotificationsIfEnabled(
    db,
    'schoolJoinRequests',
    recipients.map((admin) => ({
      user_id: admin.profile_id,
      type: 'SYSTEM' as const,
      title: 'New join request',
      message: `${requesterName} wants to join as a ${role}.`,
      link: '/school-admin/requests',
    }))
  );
}
