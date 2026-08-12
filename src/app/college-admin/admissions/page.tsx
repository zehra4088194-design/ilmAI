import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { createCollegeAdmission, updateCollegeAdmissionStatus } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademicSetup, getCollegeAdmissions } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const STATUSES = ['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'];

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
              <Input name="date_of_birth" type="date" />
              <select name="gender" className={selectClass}><option value="">Gender</option><option value="female">Female</option><option value="male">Male</option></select>
              <Input name="guardian_name" placeholder="Guardian name" required />
              <Input name="guardian_phone" placeholder="Guardian phone" required />
              <Input name="guardian_email" type="email" placeholder="Guardian email" />
              <Input name="previous_institution" placeholder="Previous institution" />
              <select name="campus_id" className={selectClass}><option value="">Campus</option>{setup.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select name="academic_year_id" className={selectClass}><option value="">Academic year</option>{setup.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <Textarea name="notes" placeholder="Admission notes" className="md:col-span-2" />
            </CollegeActionForm>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {applications.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_240px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.applicant_name}</h2>
                  <Badge variant={item.status === 'approved' || item.status === 'enrolled' ? 'secondary' : item.status === 'rejected' ? 'destructive' : 'outline'}>{item.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{item.application_number} - {item.applying_for_program} - {item.guardian_name} - {item.guardian_phone}</p>
                <p className="text-muted-foreground mt-2 text-xs">Submitted {new Date(item.submitted_at).toLocaleDateString()}</p>
              </div>
              {canManage && (
                <CollegeActionForm action={updateCollegeAdmissionStatus} submitLabel="Update" className="flex items-end gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <select name="status" defaultValue={item.status} className={selectClass}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </select>
                </CollegeActionForm>
              )}
            </CardContent>
          </Card>
        ))}
        {!applications.length && <Card><CardContent className="text-muted-foreground p-8 text-center text-sm">No admission applications yet.</CardContent></Card>}
      </div>
    </div>
  );
}
