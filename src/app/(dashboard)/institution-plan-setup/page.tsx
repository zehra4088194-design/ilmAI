import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
import { InstitutionPlanSetup } from '@/components/features/institution/InstitutionPlanSetup';

export default async function InstitutionPlanSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/institution-plan-setup');

  const school = await getSchoolContext(supabase, user.id);
  if (school && ['owner', 'admin'].includes(school.membership.member_role)) {
    const { data: plan } = await (supabase as any).from('school_organization_plan_settings')
      .select('billing_scope,student_plan_code,student_free_allowance,custom_student_price_usd,plan_setup_complete')
      .eq('organization_id', school.organization.id).maybeSingle();
    return <InstitutionPlanSetup institutionType="school" organizationId={school.organization.id} organizationName={school.organization.name}
      initialScope={plan?.billing_scope === 'institution_wide' ? 'institution_wide' : 'management'}
      initialPlanCode={['PRO','ELITE','CUSTOM'].includes(plan?.student_plan_code) ? plan.student_plan_code : 'PRO'}
      initialFreeAllowance={Number(plan?.student_free_allowance ?? 30)} initialCustomPrice={Number(plan?.custom_student_price_usd ?? 0.4)} />;
  }

  const college = await getCollegeContext(supabase, user.id);
  if (college && ['owner', 'admin'].includes(college.membership.member_role)) {
    const { data: plan } = await (supabase as any).from('college_organization_plan_settings')
      .select('billing_scope,student_plan_code,student_free_allowance,custom_student_price_usd,plan_setup_complete')
      .eq('organization_id', college.organization.id).maybeSingle();
    return <InstitutionPlanSetup institutionType="college" organizationId={college.organization.id} organizationName={college.organization.name}
      initialScope={plan?.billing_scope === 'institution_wide' ? 'institution_wide' : 'management'}
      initialPlanCode={['PRO','ELITE','CUSTOM'].includes(plan?.student_plan_code) ? plan.student_plan_code : 'PRO'}
      initialFreeAllowance={Number(plan?.student_free_allowance ?? 30)} initialCustomPrice={Number(plan?.custom_student_price_usd ?? 0.4)} />;
  }

  redirect('/dashboard');
}
