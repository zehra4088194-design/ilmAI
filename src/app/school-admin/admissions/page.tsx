import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createAdmission, updateAdmissionStatus } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup, getSchoolAdmissions } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const STATUSES = ['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'];

export default async function SchoolAdmissionsPage() {
  const { supabase, context } = await requireSchoolContext('admissions.read');
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
              <Input name="guardian_name" placeholder="Guardian name" required />
              <Input name="guardian_phone" placeholder="Guardian phone" required />
              <Input name="guardian_email" type="email" placeholder="Guardian email" />
              <Input name="previous_school" placeholder="Previous school" />
              <select name="campus_id" className={selectClass}><option value="">Campus</option>{setup.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select name="academic_year_id" className={selectClass}><option value="">Academic year</option>{setup.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <Textarea name="notes" placeholder="Admission notes" className="md:col-span-2" />
            </SchoolActionForm>
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
                <p className="text-muted-foreground mt-1 text-sm">{item.application_number} - {item.applying_for_class} - {item.guardian_name} - {item.guardian_phone}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {(item.school_admission_documents || []).length} documents - Submitted {new Date(item.submitted_at).toLocaleDateString()}
                </p>
                {(item.school_admission_documents || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.school_admission_documents.map((document: any) => (
                      <Link
                        key={document.id}
                        href={`/api/school-admin/admission-document?id=${encodeURIComponent(document.id)}`}
                        target="_blank"
                        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {document.file_name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {canManage && (
                <SchoolActionForm action={updateAdmissionStatus} submitLabel="Update" className="flex items-end gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <select name="status" defaultValue={item.status} className={selectClass}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </select>
                </SchoolActionForm>
              )}
            </CardContent>
          </Card>
        ))}
        {!applications.length && <Card><CardContent className="text-muted-foreground p-8 text-center text-sm">No admission applications yet.</CardContent></Card>}
      </div>
    </div>
  );
}
