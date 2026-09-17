import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import { syncOrganizationCollegeGrants } from '@/lib/college-erp/subscription-cascade';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionType = body?.institutionType === 'college' ? 'college' : body?.institutionType === 'school' ? 'school' : null;
  const organizationId = String(body?.organizationId || '');
  const scope = body?.scope === 'institution_wide' ? 'institution_wide' : 'management';
  const planCode = ['PRO', 'ELITE', 'CUSTOM'].includes(body?.planCode) ? body.planCode : 'PRO';
  if (!institutionType || !organizationId) return NextResponse.json({ error: 'Invalid institution.' }, { status: 400 });

  const membershipTable = institutionType === 'school' ? 'school_memberships' : 'college_memberships';
  const settingsTable = institutionType === 'school' ? 'school_organization_plan_settings' : 'college_organization_plan_settings';
  const { data: membership } = await (supabase as any)
    .from(membershipTable)
    .select('member_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership || !['owner', 'admin'].includes(membership.member_role)) {
    return NextResponse.json({ error: 'Only the institution owner/admin can change this plan.' }, { status: 403 });
  }

  const admin = (await createAdminClient()) as any;
  const { data: cfg } = await admin
    .from('institution_ai_plan_config')
    .select('free_student_allowance, student_price_usd')
    .eq('institution_type', institutionType)
    .eq('plan_code', planCode)
    .eq('is_active', true)
    .maybeSingle();
  const freeAllowance = Number(cfg?.free_student_allowance ?? 30);
  const customPrice = planCode === 'CUSTOM' ? Number(cfg?.student_price_usd ?? 0.4) : null;
  const update: Record<string, unknown> = {
    billing_scope: scope,
    student_plan_code: planCode,
    student_free_allowance: freeAllowance,
    custom_student_price_usd: customPrice,
    plan_setup_complete: true,
  };
  if (planCode === 'PRO' || planCode === 'ELITE') update.grant_tier = planCode;

  const { error } = await admin.from(settingsTable).update(update).eq('organization_id', organizationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Recalculate grants for the whole institution. The cascade itself reads billing_status and
  // applies the selected scope: in management-only mode teachers/staff keep the institution plan,
  // while students/parents keep their own plans; institution-wide mode grants everyone.
  if (institutionType === 'school') await syncOrganizationSchoolGrants(organizationId, true);
  else await syncOrganizationCollegeGrants(organizationId, true);

  return NextResponse.json({ ok: true, scope, planCode, freeAllowance, customPrice });
}
