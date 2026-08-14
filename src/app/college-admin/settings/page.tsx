import { createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import { CollegeSettingsForm } from '@/components/college/settings/CollegeSettingsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import {
  createCollegeAcademicYear,
  createCollegeCampus,
  createCollegeDepartment,
  createCollegeSection,
  createCollegeSemester,
  createCourseOffering,
  updateCollegeLogo,
  updateCollegeOrganization,
} from '@/lib/college-erp/actions';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademicSetup } from '@/lib/college-erp/queries';
import { InstitutionPaymentCheckout } from '@/components/features/institution-payments/InstitutionPaymentCheckout';
import { getActiveStudentCount } from '@/lib/institution-payments/actions';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolveInstitutionPricing } from '@/lib/platform-settings/shared';

export const metadata = { title: 'Settings | College Admin | ilm AI' };

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegeAdminSettingsPage() {
  const { supabase, context: newContext } = await requireCollegeContext('organization.manage');
  if (newContext) {
    const data = await getCollegeAcademicSetup(supabase, newContext);
    const { data: planSettings } = await supabase
      .from('college_organization_plan_settings')
      .select('billing_status, plan_tier_id, renews_on')
      .eq('organization_id', newContext.organization.id)
      .maybeSingle();
    const [platformSettings, studentCount] = await Promise.all([
      getPlatformSettings(),
      getActiveStudentCount('college', newContext.organization.id),
    ]);
    const monthlyPricing = resolveInstitutionPricing(platformSettings, 'college', 'monthly', studentCount);
    const annualPricing = resolveInstitutionPricing(platformSettings, 'college', 'annual', studentCount);
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Organization setup</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
          <CardContent>
            <CollegeActionForm action={updateCollegeOrganization} submitLabel="Update profile" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input name="name" defaultValue={newContext.organization.name} placeholder="College name" required />
              <Input name="timezone" defaultValue={newContext.organization.timezone} placeholder="Asia/Karachi" required />
              <Input name="currency" defaultValue={newContext.organization.currency} maxLength={3} placeholder="PKR" required />
              <Input name="email" type="email" defaultValue={newContext.organization.email || ''} placeholder="College email" />
              <Input name="phone" defaultValue={newContext.organization.phone || ''} placeholder="Phone" />
              <Input name="address" defaultValue={newContext.organization.address || ''} placeholder="Address" />
            </CollegeActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {newContext.organization.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newContext.organization.logo_url} alt={newContext.organization.name} className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover" />
            )}
            <div className="flex-1">
              <p className="text-muted-foreground mb-2 text-xs">
                Every enrolled member sees this logo (plus &quot;{newContext.organization.name} · Ilm AI&quot;) instead of the default Ilm AI mark on their dashboard.
              </p>
              <CollegeActionForm action={updateCollegeLogo} submitLabel="Upload logo" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input name="logo" type="file" accept="image/*" required />
              </CollegeActionForm>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan &amp; billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              Status: <span className="font-semibold">{planSettings?.billing_status || 'trial'}</span>
              {planSettings?.renews_on && ` · renews ${planSettings.renews_on}`}
            </p>
            <InstitutionPaymentCheckout
              institutionType="college"
              organizationId={newContext.organization.id}
              planTierId={planSettings?.plan_tier_id || null}
              monthly={monthlyPricing}
              annual={annualPricing}
              annualDiscountPercent={platformSettings.institutionPricing.annualDiscountPercent}
              volumeDiscountApplied={monthlyPricing.volumeDiscountApplied}
              defaultContactEmail={newContext.organization.email || ''}
            />
          </CardContent>
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Add campus</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeCampus} submitLabel="Add campus">
                <Input name="name" placeholder="Campus name" required />
                <Input name="code" placeholder="Code (e.g. MAIN)" required />
                <Input name="address" placeholder="Address" />
                <Input name="phone" placeholder="Phone" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_main" /> Main campus</label>
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Add department</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeDepartment} submitLabel="Add department">
                <Input name="name" placeholder="Department name (e.g. Computer Science)" required />
                <Input name="code" placeholder="Code (e.g. CS)" required />
                <select name="campus_id" className={selectClass}>
                  <option value="">Campus (optional)</option>
                  {data.campuses.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Add academic year</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeAcademicYear} submitLabel="Add academic year">
                <Input name="name" placeholder="2026-2027" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="starts_on" type="date" required />
                  <Input name="ends_on" type="date" required />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" /> Current year</label>
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Add semester</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeSemester} submitLabel="Add semester">
                <Input name="name" placeholder="Semester 1" required />
                <select name="campus_id" className={selectClass} required>
                  <option value="">Campus</option>
                  {data.campuses.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <select name="department_id" className={selectClass} required>
                  <option value="">Department</option>
                  {data.departments.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <select name="academic_year_id" className={selectClass} required>
                  <option value="">Academic year</option>
                  {data.years.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <Input name="semester_number" type="number" placeholder="Semester number (e.g. 1)" />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Add section</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeSection} submitLabel="Add section">
                <select name="semester_id" className={selectClass} required>
                  <option value="">Semester</option>
                  {data.semesters.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.college_academic_departments?.name} - {item.name}</option>
                  ))}
                </select>
                <Input name="name" placeholder="Section (e.g. A)" required />
                <Input name="room" placeholder="Room" />
                <Input name="capacity" type="number" defaultValue={60} />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Add course offering</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCourseOffering} submitLabel="Add course">
                <select name="section_id" className={selectClass} required>
                  <option value="">Section</option>
                  {data.sections.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
                <Input name="course_name" placeholder="Course name" required />
                <Input name="course_code" placeholder="Course code" />
                <Input name="credit_hours" type="number" step="0.5" defaultValue={3} />
              </CollegeActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Legacy settings (colleges provisioned under the old schema) — unchanged.
  const legacySupabase = await createClient();
  const {
    data: { user },
  } = await legacySupabase.auth.getUser();
  if (!user) return null;
  const legacyContext = await getCollegeAdminContext(legacySupabase, user.id);
  if (!legacyContext) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <CollegeSettingsForm college={legacyContext.college} />
    </div>
  );
}
