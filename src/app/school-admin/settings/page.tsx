import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import {
  createAcademicYear,
  createCampus,
  createSchoolClass,
  createSection,
  createSubjectOffering,
  updateSchoolLogo,
  updateSchoolOrganization,
  updateSchoolPrincipalSignature,
} from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup } from '@/lib/school-erp/queries';
import { InstitutionPaymentCheckout } from '@/components/features/institution-payments/InstitutionPaymentCheckout';
import { getActiveStudentCount } from '@/lib/institution-payments/actions';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolveInstitutionPricing } from '@/lib/platform-settings/shared';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolSettingsPage() {
  const { supabase, context } = await requireSchoolContext('organization.manage');
  if (!context) redirect('/school-admin');
  const data = await getSchoolAcademicSetup(supabase, context);
  const canManageAcademics = hasSchoolPermission(context, 'academics.manage');
  const { data: planSettings } = await supabase
    .from('school_organization_plan_settings')
    .select('billing_status, plan_tier_id, renews_on')
    .eq('organization_id', context.organization.id)
    .maybeSingle();
  const [platformSettings, studentCount] = await Promise.all([
    getPlatformSettings(),
    getActiveStudentCount('school', context.organization.id),
  ]);
  const monthlyPricing = resolveInstitutionPricing(platformSettings, 'school', 'monthly', studentCount);
  const annualPricing = resolveInstitutionPricing(platformSettings, 'school', 'annual', studentCount);

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Organization setup" description="Campuses, sessions, classes, sections, and subject ownership." />
      <Card>
        <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
        <CardContent>
          <SchoolActionForm action={updateSchoolOrganization} submitLabel="Update profile" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input name="name" defaultValue={context.organization.name} placeholder="School name" required />
            <Input name="timezone" defaultValue={context.organization.timezone} placeholder="Asia/Karachi" required />
            <Input name="currency" defaultValue={context.organization.currency} maxLength={3} placeholder="PKR" required />
            <Input name="email" type="email" defaultValue={context.organization.email || ''} placeholder="School email" />
            <Input name="phone" defaultValue={context.organization.phone || ''} placeholder="Phone" />
            <Input name="address" defaultValue={context.organization.address || ''} placeholder="Address" />
          </SchoolActionForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {context.organization.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- institution-supplied logo
            <img
              src={context.organization.logo_url}
              alt={context.organization.name}
              className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
            />
          )}
          <div className="flex-1">
            <p className="text-muted-foreground mb-2 text-xs">
              Every enrolled member sees this logo (plus &quot;{context.organization.name} · Ilm AI&quot;)
              instead of the default Ilm AI mark on their dashboard.
            </p>
            <SchoolActionForm action={updateSchoolLogo} submitLabel="Upload logo" className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input name="logo" type="file" accept="image/*" required />
            </SchoolActionForm>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Principal signature</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {context.organization.principal_signature_url && (
            // eslint-disable-next-line @next/next/no-img-element -- institution-supplied signature
            <img
              src={context.organization.principal_signature_url}
              alt="Principal signature"
              className="h-16 w-32 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
            />
          )}
          <div className="flex-1">
            <p className="text-muted-foreground mb-2 text-xs">
              Printed on Student ID Cards. Upload a scanned or photographed signature on a plain background.
            </p>
            <SchoolActionForm action={updateSchoolPrincipalSignature} submitLabel="Save" className="grid gap-2 sm:grid-cols-2">
              <Input name="principal_name" placeholder="Principal's name" defaultValue={context.organization.principal_name || ''} />
              <Input name="signature" type="file" accept="image/*" />
            </SchoolActionForm>
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
            institutionType="school"
            organizationId={context.organization.id}
            planTierId={planSettings?.plan_tier_id || null}
            monthly={monthlyPricing}
            annual={annualPricing}
            annualDiscountPercent={platformSettings.institutionPricing.annualDiscountPercent}
            volumeDiscountApplied={monthlyPricing.volumeDiscountApplied}
            defaultContactEmail={context.organization.email || ''}
            currentStudentCount={studentCount}
            volumeDiscountMinStudents={platformSettings.institutionPricing.volumeDiscountMinStudents}
            volumeDiscountPercent={platformSettings.institutionPricing.volumeDiscountPercent}
            baseMonthlyUsd={platformSettings.institutionPricing.school.monthlyUsd}
            usdToPkr={platformSettings.exchangeRate.usdToPkr}
          />
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Add campus</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createCampus} submitLabel="Add campus">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="name" placeholder="Main Campus" required />
                <Input name="code" placeholder="MAIN" required />
              </div>
              <Input name="address" placeholder="Address" />
              <Input name="phone" placeholder="Phone" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_main" /> Main campus</label>
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add academic year</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createAcademicYear} submitLabel="Add academic year">
              <Input name="name" placeholder="2026-27" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="starts_on" type="date" required />
                <Input name="ends_on" type="date" required />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" /> Set as current</label>
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add class</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSchoolClass} submitLabel="Add class">
              <Input name="name" placeholder="Grade 9" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="campus_id" className={selectClass} required>
                  <option value="">Campus</option>
                  {data.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select name="academic_year_id" className={selectClass} required>
                  <option value="">Academic year</option>
                  {data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <Input name="grade_level" placeholder="GRADE_9 (optional mapping)" />
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add section</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSection} submitLabel="Add section">
              <select name="class_id" className={selectClass} required>
                <option value="">Class</option>
                {data.classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input name="name" placeholder="A" required />
                <Input name="room" placeholder="Room 12" />
                <Input name="capacity" type="number" min={1} defaultValue={40} />
              </div>
              <select name="homeroom_teacher_id" className={selectClass}>
                <option value="">Homeroom teacher</option>
                {data.profiles.map((item: any) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                  return <option key={item.profile_id} value={item.profile_id}>{profile?.full_name}</option>;
                })}
              </select>
            </SchoolActionForm>
          </CardContent>
        </Card>
      </div>
      {canManageAcademics && (
        <Card>
          <CardHeader><CardTitle className="text-base">Subject offering</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSubjectOffering} submitLabel="Assign subject" className="grid gap-3 md:grid-cols-5 md:items-end">
              <select name="section_id" className={selectClass} required>
                <option value="">Section</option>
                {data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.school_classes?.name} - {item.name}</option>)}
              </select>
              <Input name="subject_name" placeholder="Mathematics" required />
              <select name="teacher_id" className={selectClass}>
                <option value="">Teacher</option>
                {data.profiles.map((item: any) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                  return <option key={item.profile_id} value={item.profile_id}>{profile?.full_name}</option>;
                })}
              </select>
              <Input name="weekly_periods" type="number" min={1} defaultValue={5} />
            </SchoolActionForm>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Current structure</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Campus</th><th>Year</th><th>Class</th><th>Section</th><th>Room</th><th>Capacity</th></tr></thead>
            <tbody>
              {data.sections.map((section: any) => {
                const classItem = data.classes.find((item: any) => item.id === section.class_id);
                return <tr key={section.id} className="border-b last:border-0"><td className="py-2">{classItem?.school_campuses?.name || '-'}</td><td>{classItem?.school_academic_years?.name || '-'}</td><td>{classItem?.name || '-'}</td><td>{section.name}</td><td>{section.room || '-'}</td><td>{section.capacity}</td></tr>;
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
