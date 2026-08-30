import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { AdmissionsList } from '@/components/features/college-erp/AdmissionsList';
import { createCollegeAdmission, updateCollegeAdmissionStatus } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademicSetup, getCollegeAdmissions } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegeAdmissionsPage() {
  const { supabase, context } = await requireCollegeContext('admissions.read', 'admissions');
  if (!context) redirect('/college-admin');
  const [applications, setup] = await Promise.all([getCollegeAdmissions(supabase, context), getCollegeAcademicSetup(supabase, context)]);
  const canManage = hasCollegePermission(context, 'admissions.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Applications, review, and enrollment tracking. A public self-serve application form (like schools have) hasn&apos;t
          been built for colleges yet — applications are entered here for now.
        </p>
      </div>
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">New application</CardTitle></CardHeader>
          <CardContent>
            <CollegeActionForm action={createCollegeAdmission} submitLabel="Create application" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="applicant_name" placeholder="Applicant name" required />
              <Input name="applying_for_program" placeholder="Applying for program" required />
              <select name="status" className={selectClass} defaultValue="submitted">
                <option value="inquiry">Just an inquiry</option>
                <option value="visit_scheduled">Visit scheduled</option>
                <option value="entry_test_scheduled">Entry test scheduled</option>
                <option value="submitted">Full application</option>
              </select>
              <Input name="date_of_birth" type="date" />
              <select name="gender" className={selectClass}><option value="">Gender</option><option value="female">Female</option><option value="male">Male</option></select>
              <Input name="guardian_name" placeholder="Guardian name" required />
              <Input name="guardian_phone" placeholder="Guardian phone" required />
              <Input name="guardian_email" type="email" placeholder="Guardian email" />
              <Input
                name="applicant_email"
                type="email"
                placeholder="Applicant's own email (if they have an ilm AI account)"
                title="Lets Update > Enrolled auto-create the enrollment once this application is marked enrolled"
              />
              <Input name="previous_institution" placeholder="Previous institution" />
              <select name="campus_id" className={selectClass}><option value="">Campus</option>{setup.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select name="academic_year_id" className={selectClass}><option value="">Academic year</option>{setup.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <Textarea name="notes" placeholder="Admission notes" className="md:col-span-2" />
            </CollegeActionForm>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Funnel</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {['inquiry', 'visit_scheduled', 'entry_test_scheduled', 'submitted', 'under_review', 'approved', 'enrolled'].map((stage) => {
            const count = applications.filter((item: any) => item.status === stage).length;
            return (
              <div key={stage} className="border-border min-w-[110px] rounded-lg border px-3 py-2 text-center">
                <p className="text-lg font-bold">{count}</p>
                <p className="text-muted-foreground text-[11px] capitalize">{stage.replace('_', ' ')}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <AdmissionsList
        applications={applications}
        canManage={canManage}
        updateCollegeAdmissionStatus={updateCollegeAdmissionStatus}
        sections={setup.sections}
        years={setup.years}
      />
    </div>
  );
}
