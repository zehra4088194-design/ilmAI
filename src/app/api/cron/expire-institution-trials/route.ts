import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import { syncOrganizationCollegeGrants } from '@/lib/college-erp/subscription-cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Revokes AI access for institutions whose configured trial window has passed
// (school_organization_plan_settings.trial_ends_at / college's mirror) and flips
// their billing_status to 'suspended' so admins see it plainly on /admin/schools
// and /admin/colleges instead of the trial silently expiring with no visible
// signal. Subscription grants themselves (`subscriptions.current_period_end`)
// are already set to trial_ends_at at grant time, so selectEffectiveSubscription
// would compute FREE for these users on its own — but profiles.subscription_tier
// is a cached column that only gets recomputed when grant/revoke actually runs,
// so this sweep is what makes an expired trial actually take effect.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = (await createAdminClient()) as any;
  const nowIso = new Date().toISOString();
  let schoolExpired = 0;
  let collegeExpired = 0;

  const { data: expiredSchools } = await admin
    .from('school_organization_plan_settings')
    .select('organization_id')
    .eq('billing_status', 'trial')
    .lt('trial_ends_at', nowIso);
  for (const row of expiredSchools || []) {
    await syncOrganizationSchoolGrants(row.organization_id, false);
    await admin
      .from('school_organization_plan_settings')
      .update({ billing_status: 'suspended', updated_at: nowIso })
      .eq('organization_id', row.organization_id);
    schoolExpired += 1;
  }

  const { data: expiredColleges } = await admin
    .from('college_organization_plan_settings')
    .select('organization_id')
    .eq('billing_status', 'trial')
    .lt('trial_ends_at', nowIso);
  for (const row of expiredColleges || []) {
    await syncOrganizationCollegeGrants(row.organization_id, false);
    await admin
      .from('college_organization_plan_settings')
      .update({ billing_status: 'suspended', updated_at: nowIso })
      .eq('organization_id', row.organization_id);
    collegeExpired += 1;
  }

  return NextResponse.json({ status: 'success', schoolExpired, collegeExpired });
}
