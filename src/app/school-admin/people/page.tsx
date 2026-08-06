import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { addSchoolMember, enrollStudent, linkGuardian } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolPeople } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolPeoplePage() {
  const { supabase, context } = await requireSchoolContext('people.read');
  if (!context) redirect('/school-admin');
  const data = await getSchoolPeople(supabase, context);
  const canManage = hasSchoolPermission(context, 'people.manage');
  const canEnroll = hasSchoolPermission(context, 'admissions.manage');
  const maxStudents = Number(data.planSettings?.max_students || 200);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="People"
        description="Students, teachers, staff, parents, enrollment and guardian relationships."
        action={<div className="border-border bg-card rounded-lg border px-4 py-2 text-right"><p className="text-muted-foreground text-[11px]">Student plan usage</p><p className="font-bold">{data.activeStudentCount.toLocaleString()} / {maxStudents.toLocaleString()}</p></div>}
      />
      {(canManage || canEnroll) && (
        <div className="grid gap-5 xl:grid-cols-3">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add member</CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolActionForm action={addSchoolMember} submitLabel="Add member">
                  <Input name="email" type="email" placeholder="Registered account email" required />
                  <select name="member_role" className={selectClass} required>
                    <option value="">Role</option>
                    {['admin', 'admissions', 'teacher', 'staff', 'accountant'].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <Input name="designation" placeholder="Designation" />
                  <Input name="employee_code" placeholder="Employee code" />
                </SchoolActionForm>
              </CardContent>
            </Card>
          )}
          {canEnroll && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enroll student</CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolActionForm action={enrollStudent} submitLabel="Enroll student">
                  <Input name="student_email" type="email" placeholder="Registered student email" required />
                  <select name="academic_year_id" className={selectClass} required>
                    <option value="">Academic year</option>
                    {data.years.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select name="section_id" className={selectClass} required>
                    <option value="">Section</option>
                    {data.sections.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.school_classes?.name} - {item.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input name="admission_number" placeholder="Admission no." required />
                    <Input name="roll_number" placeholder="Roll no." />
                  </div>
                </SchoolActionForm>
              </CardContent>
            </Card>
          )}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link guardian</CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolActionForm action={linkGuardian} submitLabel="Link guardian">
                  <select name="student_id" className={selectClass} required>
                    <option value="">Student</option>
                    {data.enrollments.map((item: any) => {
                      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                      return (
                        <option key={item.student_id} value={item.student_id}>
                          {profile?.full_name}
                        </option>
                      );
                    })}
                  </select>
                  <Input name="guardian_email" type="email" placeholder="Registered guardian email" required />
                  <Input name="relationship" placeholder="Mother / Father / Guardian" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_primary" /> Primary guardian
                  </label>
                </SchoolActionForm>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Designation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.memberships.map((item: any) => {
                const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{profile?.full_name}</td>
                    <td>{profile?.email}</td>
                    <td className="capitalize">{item.member_role}</td>
                    <td>{item.designation || '-'}</td>
                    <td>
                      <Badge variant={item.status === 'active' ? 'secondary' : 'outline'}>{item.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
