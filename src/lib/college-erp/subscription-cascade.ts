import { createAdminClient } from '@/lib/supabase/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';

// College-side mirror of src/lib/school-erp/subscription-cascade.ts — see that file's header
// comment for the full rationale. Deliberately a separate module (own grant-id namespace
// `college_erp:...` vs `school_erp:...`) rather than a shared generic "institution" cascade, per
// CLAUDE_CODE_MASTER_PROMPT.md's "data and portals stay separate" instruction — even though the
// logic underneath is identical in shape.
const COLLEGE_GRANT_TIER = 'PRO';
const COLLEGE_GRANT_PROVIDER = 'college_erp';
const COLLEGE_GRANT_PERIOD_END = '2099-12-31T00:00:00.000Z';

function collegeGrantSubscriptionId(organizationId: string, profileId: string) {
  return `college_erp:${organizationId}:${profileId}`;
}

async function reconcileProfileTier(db: any, profileId: string) {
  const { data } = await db.from('subscriptions').select('tier, status, current_period_end').eq('user_id', profileId);
  const access = selectEffectiveSubscription(data || []);
  await db
    .from('profiles')
    .update({ subscription_tier: access.tier, subscription_expires_at: access.expiresAt })
    .eq('id', profileId);
}

export async function isCollegeOrganizationBillingActive(db: any, organizationId: string) {
  const { data } = await db
    .from('college_organization_plan_settings')
    .select('billing_status')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data?.billing_status === 'active';
}

export async function grantCollegeSubscription(organizationId: string, profileId: string) {
  const admin = (await createAdminClient()) as any;
  await admin.from('subscriptions').upsert(
    {
      user_id: profileId,
      provider: COLLEGE_GRANT_PROVIDER,
      provider_subscription_id: collegeGrantSubscriptionId(organizationId, profileId),
      tier: COLLEGE_GRANT_TIER,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: COLLEGE_GRANT_PERIOD_END,
      cancel_at_period_end: false,
    },
    { onConflict: 'provider_subscription_id' }
  );
  await reconcileProfileTier(admin, profileId);
}

export async function revokeCollegeSubscription(organizationId: string, profileId: string) {
  const admin = (await createAdminClient()) as any;
  await admin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('provider_subscription_id', collegeGrantSubscriptionId(organizationId, profileId));
  await reconcileProfileTier(admin, profileId);
}

/**
 * Toggles the college grant for every active member of an institution. Bulk by design — see
 * school's syncOrganizationSchoolGrants for why (a 500-member institution run one member at a
 * time times out mid-cascade).
 */
export async function syncOrganizationCollegeGrants(organizationId: string, shouldGrant: boolean) {
  const admin = (await createAdminClient()) as any;
  const { data: members } = await admin
    .from('college_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  const profileIds = Array.from(new Set<string>((members || []).map((member: any) => String(member.profile_id))));
  if (!profileIds.length) return;

  if (shouldGrant) {
    const now = new Date().toISOString();
    await admin.from('subscriptions').upsert(
      profileIds.map((profileId) => ({
        user_id: profileId,
        provider: COLLEGE_GRANT_PROVIDER,
        provider_subscription_id: collegeGrantSubscriptionId(organizationId, profileId),
        tier: COLLEGE_GRANT_TIER,
        status: 'active',
        current_period_start: now,
        current_period_end: COLLEGE_GRANT_PERIOD_END,
        cancel_at_period_end: false,
      })),
      { onConflict: 'provider_subscription_id' }
    );
  } else {
    await admin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .in(
        'provider_subscription_id',
        profileIds.map((profileId) => collegeGrantSubscriptionId(organizationId, profileId))
      );
  }

  await reconcileProfileTiers(admin, profileIds);
}

async function reconcileProfileTiers(db: any, profileIds: string[]) {
  if (!profileIds.length) return;
  const { data: rows } = await db
    .from('subscriptions')
    .select('user_id, tier, status, current_period_end')
    .in('user_id', profileIds);

  const byUser = new Map<string, any[]>();
  for (const profileId of profileIds) byUser.set(profileId, []);
  for (const row of rows || []) {
    const list = byUser.get(String(row.user_id));
    if (list) list.push(row);
  }

  const buckets = new Map<string, { tier: string; expiresAt: string | null; ids: string[] }>();
  for (const [profileId, subscriptions] of byUser) {
    const access = selectEffectiveSubscription(subscriptions);
    const key = `${access.tier}|${access.expiresAt || ''}`;
    const bucket = buckets.get(key) || { tier: access.tier, expiresAt: access.expiresAt, ids: [] };
    bucket.ids.push(profileId);
    buckets.set(key, bucket);
  }

  for (const bucket of buckets.values()) {
    await db
      .from('profiles')
      .update({ subscription_tier: bucket.tier, subscription_expires_at: bucket.expiresAt })
      .in('id', bucket.ids);
  }
}
