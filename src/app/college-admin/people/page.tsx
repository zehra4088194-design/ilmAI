import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Upload } from 'lucide-react';
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
            <Link href="#" className="border-border hover:bg-muted pointer-events-none inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium opacity-50">
              <Upload className="h-3.5 w-3.5" />
              Bulk import (not ported yet)
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
            <Card>
              <CardHeader><CardTitle className="text-base">Add member</CardTitle></CardHeader>
              <CardContent>
                <CollegeActionForm action={addCollegeMember} submitLabel="Add member">
                  <Input name="email" type="email" placeholder="Registered account email" required />
                  <select name="member_role" className={selectClass} required>
                    <option value="">Role</option>
                    {['admin', 'admissions', 'teacher', 'staff', 'accountant'].map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <Input name="designation" placeholder="Designation" />
                  <Input name="employee_code" placeholder="Employee code" />
                </CollegeActionForm>
              </CardContent>
            </Card>
          )}
          {canEnroll && (
            <Card>
              <CardHeader><CardTitle className="text-base">Enroll student</CardTitle></CardHeader>
              <CardContent>
                <CollegeActionForm action={enrollCollegeStudent} submitLabel="Enroll student">
                  <Input name="student_email" type="email" placeholder="Registered student email" required />
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
                    <Input name="roll_number" placeholder="Roll no." />
                  </div>
                </CollegeActionForm>
              </CardContent>
            </Card>
          )}
          {canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Link guardian</CardTitle></CardHeader>
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
