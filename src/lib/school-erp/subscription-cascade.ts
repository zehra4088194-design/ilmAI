import { createAdminClient } from '@/lib/supabase/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';

const SCHOOL_GRANT_PROVIDER = 'school_erp';
const SCHOOL_GRANT_PERIOD_END = '2099-12-31T00:00:00.000Z';

function schoolGrantSubscriptionId(organizationId: string, profileId: string) {
  return `school_erp:${organizationId}:${profileId}`;
}

async function resolveGrantParams(db: any, organizationId: string) {
  const { data: plan } = await db
    .from('school_organization_plan_settings')
    .select('grant_tier, billing_status, trial_ends_at, billing_scope')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const tier: 'PRO' | 'ELITE' = plan?.grant_tier === 'ELITE' ? 'ELITE' : 'PRO';
  const periodEnd = plan?.billing_status === 'trial' && plan?.trial_ends_at
    ? plan.trial_ends_at
    : SCHOOL_GRANT_PERIOD_END;
  const billingScope = plan?.billing_scope === 'institution_wide' ? 'institution_wide' : 'management';
  return { tier, periodEnd, billingScope } as const;
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
  if (data?.billing_status === 'trial' && data?.trial_ends_at) {
    return new Date(data.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

async function schoolRoleReceivesInstitutionGrant(db: any, organizationId: string, profileId: string, billingScope: 'management' | 'institution_wide') {
  if (billingScope === 'institution_wide') return true;
  const { data: membership } = await db
    .from('school_memberships')
    .select('member_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle();
  return !['student', 'parent'].includes(String(membership?.member_role || ''));
}

export async function grantSchoolSubscription(organizationId: string, profileId: string) {
  const admin = (await createAdminClient()) as any;
  const { tier, periodEnd, billingScope } = await resolveGrantParams(admin, organizationId);
  if (!(await isOrganizationBillingActive(admin, organizationId)) || !(await schoolRoleReceivesInstitutionGrant(admin, organizationId, profileId, billingScope))) {
    await admin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('provider_subscription_id', schoolGrantSubscriptionId(organizationId, profileId));
    await reconcileProfileTier(admin, profileId);
    return;
  }
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

export async function syncOrganizationSchoolGrants(organizationId: string, shouldGrant: boolean) {
  const admin = (await createAdminClient()) as any;
  const billingActive = await isOrganizationBillingActive(admin, organizationId);
  const { data: members } = await admin
    .from('school_memberships')
    .select('profile_id, member_role')
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  const rows = (members || []).map((member: any) => ({
    profileId: String(member.profile_id),
    role: String(member.member_role || ''),
  }));
  const allProfileIds: string[] = Array.from(new Set(rows.map((row: { profileId: string }) => row.profileId)));
  if (!allProfileIds.length) return;

  if (shouldGrant && billingActive) {
    const { tier, periodEnd, billingScope } = await resolveGrantParams(admin, organizationId);
    const targetRows = billingScope === 'institution_wide'
      ? rows
      : rows.filter((row: { role: string }) => !['student', 'parent'].includes(row.role));
    const eligibleIds: string[] = Array.from(new Set(targetRows.map((row: { profileId: string }) => row.profileId)));
    const staleIds = allProfileIds.filter((id) => !eligibleIds.includes(id));
    if (eligibleIds.length) {
      const now = new Date().toISOString();
      await admin.from('subscriptions').upsert(
        eligibleIds.map((profileId) => ({
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
    }
    if (staleIds.length) {
      await admin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .in('provider_subscription_id', staleIds.map((profileId) => schoolGrantSubscriptionId(organizationId, profileId)));
    }
  } else {
    await admin
      .from('subscriptions')
      .update({ status: 'canceled' })
      .in('provider_subscription_id', allProfileIds.map((profileId) => schoolGrantSubscriptionId(organizationId, profileId)));
  }

  await reconcileProfileTiers(admin, allProfileIds);
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
