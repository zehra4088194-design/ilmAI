import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { AdmissionsList } from '@/components/features/school-erp/AdmissionsList';
import { createAdmission, updateAdmissionStatus } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup, getSchoolAdmissions } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolAdmissionsPage() {
  const { supabase, context } = await requireSchoolContext('admissions.read', 'admissions');
  if (!context) redirect('/school-admin');
  const [applications, setup] = await Promise.all([
    getSchoolAdmissions(supabase, context),
    getSchoolAcademicSetup(supabase, context),
  ]);
  const canManage = hasSchoolPermission(context, 'admissions.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Admissions"
        description="Online applications, review, waiting list, approval, and enrollment tracking."
        action={<Link href={`/schools/${context.organization.slug}/admissions`} target="_blank" className="border-input bg-background hover:bg-accent inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">Open public form</Link>}
      />
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">New application</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createAdmission} submitLabel="Create application" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="applicant_name" placeholder="Applicant name" required />
              <Input name="applying_for_class" placeholder="Applying for class" required />
              <Input name="date_of_birth" type="date" />
              <select name="gender" className={selectClass}><option value="">Gender</option><option value="girl">Girl</option><option value="boy">Boy</option></select>
              <Input name="b_form_number" placeholder="Student B-Form number" />
              <div className="flex flex-col gap-1">
                <label htmlFor="student_photo" className="text-muted-foreground text-xs">Student photo</label>
                <input id="student_photo" name="student_photo" type="file" accept="image/*" className="text-xs" />
              </div>
              <Input name="guardian_name" placeholder="Guardian name (mother or father)" required />
              <Input name="guardian_phone" placeholder="Guardian phone (mother or father)" required />
              <Input name="guardian_cnic" placeholder="Guardian CNIC number" />
              <Input name="guardian_email" type="email" placeholder="Guardian email" />
              <Input name="previous_school" placeholder="Previous school" />
              <select name="campus_id" className={selectClass}><option value="">Campus</option>{setup.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select name="academic_year_id" className={selectClass}><option value="">Academic year</option>{setup.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <Textarea name="notes" placeholder="Admission notes" className="md:col-span-2" />
            </SchoolActionForm>
          </CardContent>
        </Card>
      )}
      <AdmissionsList applications={applications} canManage={canManage} updateAdmissionStatus={updateAdmissionStatus} />
    </div>
  );
}
