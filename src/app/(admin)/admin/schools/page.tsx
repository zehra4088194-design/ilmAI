import { createAdminClient } from '@/lib/supabase/server';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DEFAULT_SCHOOL_MODULES, SCHOOL_MODULES } from '@/lib/school-erp/modules';
import { createSchoolOrganization, updateSchoolPlanSettings } from './actions';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function AdminSchoolsPage() {
  const db = (await createAdminClient()) as any;
  const { data } = await db
    .from('school_organizations')
    .select('*, school_campuses(id), school_memberships(id, member_role, profiles(full_name, email)), school_organization_plan_settings(*), school_principal_links(slug)')
    .order('created_at', { ascending: false });
  const { data: planTiers } = await db
    .from('institution_plan_tiers')
    .select('*')
    .eq('is_active', true)
    .order('institution_type')
    .order('max_students');
  const schools = data || [];

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Schools & academies" description="Create tenants, bootstrap the owner, and monitor multi-campus organizations." />
      <Card>
        <CardHeader><CardTitle className="text-base">Create organization</CardTitle></CardHeader>
        <CardContent>
          <SchoolActionForm action={createSchoolOrganization} submitLabel="Create school" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input name="name" placeholder="School name" required />
            <Input name="slug" placeholder="Public slug (optional)" />
            <select name="organization_type" className={selectClass}><option value="school">School</option><option value="academy">Academy</option><option value="college">College</option></select>
            <Input name="owner_email" type="email" placeholder="Registered owner email" required />
            <Input name="campus_name" placeholder="Main Campus" />
            <Input name="email" type="email" placeholder="School email" />
            <Input name="phone" placeholder="School phone" />
            <Input name="address" placeholder="Address" />
          </SchoolActionForm>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schools.map((school: any) => {
          const ownerLink = (school.school_memberships || []).find((item: any) => item.member_role === 'owner');
          const owner = Array.isArray(ownerLink?.profiles) ? ownerLink.profiles[0] : ownerLink?.profiles;
          const plan = Array.isArray(school.school_organization_plan_settings)
            ? school.school_organization_plan_settings[0]
            : school.school_organization_plan_settings;
          const principalLink = Array.isArray(school.school_principal_links)
            ? school.school_principal_links[0]
            : school.school_principal_links;
          return (
            <Card key={school.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{school.name}</h2><p className="text-muted-foreground mt-1 text-xs">/{school.slug} - {school.organization_type}</p></div><span className={`h-2.5 w-2.5 rounded-full ${school.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div>
                <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs"><span>{school.school_campuses?.length || 0} campuses</span><span>{school.school_memberships?.length || 0} memberships</span><span>Students max {plan?.max_students ?? 200}</span><span>${Number(plan?.monthly_price_usd ?? 10).toLocaleString()}/mo</span></div>
                <p className="text-muted-foreground truncate text-xs">Owner: {owner?.full_name || owner?.email || 'Not assigned'}</p>
                <p className="text-muted-foreground truncate text-xs">Principal link: /principal/{principalLink?.slug || school.slug}</p>
                <SchoolActionForm action={updateSchoolPlanSettings} submitLabel="Save plan" className="grid gap-2">
                  <input type="hidden" name="organization_id" value={school.id} />
                  <select name="plan_tier_id" className={selectClass} defaultValue={plan?.plan_tier_id || ''}>
                    <option value="">Custom plan</option>
                    {(planTiers || []).map((tier: any) => <option key={tier.id} value={tier.id}>{tier.name} - max {tier.max_students}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select name="billing_status" className={selectClass} defaultValue={plan?.billing_status || 'trial'}>
                      {['trial', 'active', 'past_due', 'manual_review', 'suspended', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <select name="grant_tier" className={selectClass} defaultValue={plan?.grant_tier || 'PRO'} title="AI tier granted to every active member">
                      <option value="PRO">Pro</option>
                      <option value="ELITE">Elite</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      name="trial_days"
                      type="number"
                      min={1}
                      defaultValue={plan?.trial_days ?? ''}
                      placeholder="Trial length (days) — only used when status = trial"
                    />
                    {plan?.billing_status === 'trial' && plan?.trial_ends_at && (
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        Current trial ends {new Date(plan.trial_ends_at).toLocaleDateString()}. Leave blank to keep it;
                        enter a number to restart the trial from today.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input name="max_students" type="number" min={0} defaultValue={plan?.max_students ?? 200} placeholder="Students" />
                    <Input name="max_teachers" type="number" min={0} defaultValue={plan?.max_teachers ?? 25} placeholder="Teachers" />
                    <Input name="max_storage_gb" type="number" min={0} defaultValue={plan?.max_storage_gb ?? 10} placeholder="GB" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="monthly_price_usd" type="number" min={0} step="0.01" defaultValue={plan?.monthly_price_usd ?? 10} placeholder="USD/mo" />
                    <Input name="monthly_price_pkr" type="number" min={0} step="1" defaultValue={plan?.monthly_price_pkr ?? 0} placeholder="PKR/mo" />
                  </div>
                  <fieldset className="border-border rounded-lg border p-3">
                    <legend className="text-muted-foreground px-1 text-[11px]">Enabled modules</legend>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {SCHOOL_MODULES.map((module) => {
                        const enabled = plan?.enabled_modules
                          ? plan.enabled_modules.includes(module.key)
                          : DEFAULT_SCHOOL_MODULES.includes(module.key);
                        return (
                          <label key={module.key} className="flex items-center gap-2 text-xs" title={module.description}>
                            <input
                              type="checkbox"
                              name="enabled_modules"
                              value={module.key}
                              defaultChecked={enabled}
                              disabled={module.key === 'dashboard'}
                              className="h-3.5 w-3.5 rounded"
                            />
                            {module.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Input name="notes" defaultValue={plan?.notes || ''} placeholder="Internal notes" />
                </SchoolActionForm>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
