import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, Upload, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { PeopleDirectoryTable } from '@/components/features/school-erp/PeopleDirectoryTable';
import { addCollegeMember, enrollCollegeStudent, linkCollegeGuardian } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegePeople } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegePeoplePage() {
  const { supabase, context } = await requireCollegeContext('people.read', 'people');
  if (!context) redirect('/college-admin');
  const data = await getCollegePeople(supabase, context);
  const canManage = hasCollegePermission(context, 'people.manage');
  const canEnroll = hasCollegePermission(context, 'admissions.manage');
  const maxStudents = Number(data.planSettings?.max_students || 500);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground mt-1 text-sm">Students, teachers, staff, parents, enrollment and guardian relationships.</p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href="/college-admin/people/import" className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium">
              <Upload className="h-3.5 w-3.5" />
              Bulk import
            </Link>
          )}
          <div className="border-border bg-card rounded-lg border px-4 py-2 text-right">
            <p className="text-muted-foreground text-[11px]">Student plan usage</p>
            <p className="font-bold">{data.activeStudentCount.toLocaleString()} / {maxStudents.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {(canManage || canEnroll) && (
        <div className="grid gap-5 xl:grid-cols-3">
          {canManage && (
            <Card className="border-violet-500/25 bg-violet-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  Add teacher / staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollegeActionForm action={addCollegeMember} submitLabel="Add teacher / staff">
                  <Input name="email" type="email" placeholder="Their email address" required />
                  <select name="member_role" className={selectClass} required>
                    <option value="">Role</option>
                    {['teacher', 'staff', 'accountant', 'admissions', 'admin'].map((role) => (
                      <option key={role} value={role} className="capitalize">{role}</option>
                    ))}
                  </select>
                  <Input name="designation" placeholder="Designation (optional)" />
                  <Input name="employee_code" placeholder="Employee code (optional)" />
                </CollegeActionForm>
                <p className="text-muted-foreground mt-3 text-xs">
                  No account yet? They&apos;ll get an email to set a password — no need to sign up first.
                </p>
              </CardContent>
            </Card>
          )}
          {canEnroll && (
            <Card className="border-emerald-500/25 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  Add student
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollegeActionForm action={enrollCollegeStudent} submitLabel="Add student">
                  <Input name="student_name" placeholder="Student's full name" />
                  <Input name="student_email" type="email" placeholder="Their email address" required />
                  <select name="academic_year_id" className={selectClass} required>
                    <option value="">Academic year</option>
                    {data.years.map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
                  </select>
                  <select name="section_id" className={selectClass} required>
                    <option value="">Section</option>
                    {data.sections.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.college_semesters?.name} - {item.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input name="registration_number" placeholder="Registration no." required />
                    <Input name="roll_number" placeholder="Roll no. (optional)" />
                  </div>
                </CollegeActionForm>
                <p className="text-muted-foreground mt-3 text-xs">
                  New to ilm AI? That&apos;s fine — an account is created automatically and they get an email to set
                  a password.
                </p>
              </CardContent>
            </Card>
          )}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                    <Users className="h-4 w-4" />
                  </span>
                  Link guardian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollegeActionForm action={linkCollegeGuardian} submitLabel="Link guardian">
                  <select name="student_id" className={selectClass} required>
                    <option value="">Student</option>
                    {data.enrollments.map((item: any) => {
                      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                      return (<option key={item.student_id} value={item.student_id}>{profile?.full_name}</option>);
                    })}
                  </select>
                  <Input name="guardian_email" type="email" placeholder="Registered guardian email" required />
                  <Input name="relationship" placeholder="Mother / Father / Guardian" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary" /> Primary guardian</label>
                </CollegeActionForm>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Directory</CardTitle></CardHeader>
        <CardContent>
          <PeopleDirectoryTable
            memberships={data.memberships.map((item: any) => ({
              id: item.id,
              member_role: item.member_role,
              designation: item.designation,
              status: item.status,
              profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
