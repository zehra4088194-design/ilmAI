import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceRegister } from '@/components/features/school-erp/AttendanceRegister';
import { StaffAttendanceRegister } from '@/components/features/school-erp/StaffAttendanceRegister';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { reviewLeaveRequest } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAttendance } from '@/lib/school-erp/queries';

export default async function SchoolAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { supabase, context } = await requireSchoolContext('attendance.read', 'attendance');
  if (!context) redirect('/school-admin');
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || '') ? params.date! : new Date().toISOString().slice(0, 10);
  const data = await getSchoolAttendance(supabase, context, date);
  const canManage = hasSchoolPermission(context, 'attendance.manage');
  const canManageStaff = ['owner', 'admin'].includes(context.membership.member_role);

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Attendance" description="Daily student attendance, late arrivals, absences, and leave decisions." />
      <Card>
        <CardHeader><CardTitle className="text-base">Daily register</CardTitle></CardHeader>
        <CardContent>
          <AttendanceRegister {...data} canManage={canManage} />
        </CardContent>
      </Card>
      {canManageStaff && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff attendance</CardTitle></CardHeader>
          <CardContent><StaffAttendanceRegister members={data.staffMembers} records={data.staffRecords} date={date} /></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Leave requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.leaves.map((item: any) => {
            const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return (
              <div key={item.id} className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{profile?.full_name || 'Member'}</p><Badge variant="outline">{item.status}</Badge></div>
                  <p className="text-muted-foreground mt-1 text-xs">{item.starts_on} to {item.ends_on} - {item.reason}</p>
                </div>
                {canManage && item.status === 'pending' && (
                  <div className="flex gap-2">
                    {['approved', 'rejected'].map((status) => (
                      <SchoolActionForm key={status} action={reviewLeaveRequest} submitLabel={status === 'approved' ? 'Approve' : 'Reject'} className="">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={status} />
                      </SchoolActionForm>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!data.leaves.length && <p className="text-muted-foreground text-sm">No leave requests.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
