import { createAdminClient } from '@/lib/supabase/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';

// Institutions on a paid ("active") billing status grant their active members
// (teachers, students, staff) an AI subscription for as long as membership +
// billing stay active. Grants ride the same `subscriptions` table real payment
// providers use, so a member's own paid subscription (tracked separately) is
// never clobbered — selectEffectiveSubscription always picks the highest
// active tier across every row for that user.
const SCHOOL_GRANT_PROVIDER = 'school_erp';
// Far-future end date used when billing_status is 'active' (no real expiry —
// lifetime is governed by membership + billing_status). When billing_status is
// 'trial', the plan row's own trial_ends_at is used instead, so trial grants
// actually expire (see /api/cron/expire-institution-trials).
const SCHOOL_GRANT_PERIOD_END = '2099-12-31T00:00:00.000Z';

function schoolGrantSubscriptionId(organizationId: string, profileId: string) {
  return `school_erp:${organizationId}:${profileId}`;
}

/**
 * Reads the institution's admin-configured grant tier (PRO/ELITE, default PRO
 * for orgs with no plan row yet) and the correct subscription period_end for
 * its current billing_status: a 'trial' with a set trial_ends_at grants only
 * until that date; anything else (including 'active') grants until the
 * far-future sentinel, since real expiry there is governed by billing_status
 * itself, not this column.
 */
async function resolveGrantParams(db: any, organizationId: string) {
  const { data: plan } = await db
    .from('school_organization_plan_settings')
    .select('grant_tier, billing_status, trial_ends_at')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const tier: 'PRO' | 'ELITE' = plan?.grant_tier === 'ELITE' ? 'ELITE' : 'PRO';
  const periodEnd = plan?.billing_status === 'trial' && plan?.trial_ends_at ? plan.trial_ends_at : SCHOOL_GRANT_PERIOD_END;
  return { tier, periodEnd };
}

async function reconcileProfileTier(db: any, profileId: string) {
  const { data } = await db.from('subscriptions').select('tier, status, current_period_end').eq('user_id', profileId);
  const access = selectEffectiveSubscription(data || []);
  await db
    .from('profiles')
    .update({ subscription_tier: access.tier, subscription_expires_at: access.expiresAt })
    .eq('id', profileId);
}

export async function isOrganizationBillingActive(db: any, organizationId: string) {
  const { data } = await db
    .from('school_organization_plan_settings')
    .select('billing_status, trial_ends_at')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (data?.billing_status === 'active') return true;
  // An in-progress trial also grants access — matches whatever
  // syncOrganizationSchoolGrants(orgId, true) already did when the trial was
  // started, so a teacher/student added mid-trial gets the same access as
  // everyone else instead of being silently left out.
  if (data?.billing_status === 'trial' && data?.trial_ends_at) {
    return new Date(data.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

export async function grantSchoolSubscription(organizationId: string, profileId: string) {
  const admin = (await createAdminClient()) as any;
  const { tier, periodEnd } = await resolveGrantParams(admin, organizationId);
  await admin.from('subscriptions').upsert(
    {
      user_id: profileId,
      provider: SCHOOL_GRANT_PROVIDER,
      provider_subscription_id: schoolGrantSubscriptionId(organizationId, profileId),
      tier,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      cancel_at_period_end: false,
    },
    { onConflict: 'provider_subscription_id' }
  );
  await reconcileProfileTier(admin, profileId);
}

export async function revokeSchoolSubscription(organizationId: string, profileId: string) {
  const admin = (await createAdminClient()) as any;
  await admin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('provider_subscription_id', schoolGrantSubscriptionId(organizationId, profileId));
  await reconcileProfileTier(admin, profileId);
}

/**
 * Toggles the school grant for every active member of an institution.
 *
 * Deliberately bulk: a 500-member school run one member at a time was two
 * round trips per member inside a single server action, which times out and
 * leaves half the school granted and half not. Everything below is a fixed
 * number of queries regardless of school size.
 */
export async function syncOrganizationSchoolGrants(organizationId: string, shouldGrant: boolean) {
  const admin = (await createAdminClient()) as any;
  const { data: members } = await admin
    .from('school_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  const profileIds = Array.from(new Set<string>((members || []).map((member: any) => String(member.profile_id))));
  if (!profileIds.length) return;

  if (shouldGrant) {
    const { tier, periodEnd } = await resolveGrantParams(admin, organizationId);
    const now = new Date().toISOString();
    await admin.from('subscriptions').upsert(
      profileIds.map((profileId) => ({
        user_id: profileId,
        provider: SCHOOL_GRANT_PROVIDER,
        provider_subscription_id: schoolGrantSubscriptionId(organizationId, profileId),
        tier,
        status: 'active',
        current_period_start: now,
        current_period_end: periodEnd,
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
        profileIds.map((profileId) => schoolGrantSubscriptionId(organizationId, profileId))
      );
  }

  await reconcileProfileTiers(admin, profileIds);
}

/**
 * Recomputes profiles.subscription_tier for many users in one pass. Each user
 * still gets the highest active tier across all of their subscription rows, so
 * a member who also pays for ELITE themselves never gets downgraded to the
 * school's PRO grant.
 */
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

  // Group users by resulting tier so this is a handful of updates, not one per
  // user. Users with the same tier + expiry share a single UPDATE ... IN (...).
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
