import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollegeAttendanceRegister } from '@/components/features/college-erp/CollegeAttendanceRegister';
import { CollegeAttendanceScanUploader } from '@/components/features/college-erp/CollegeAttendanceScanUploader';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { reviewCollegeLeaveRequest } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAttendance } from '@/lib/college-erp/queries';
import { listBiometricDevices } from '@/lib/biometric/actions';
import { BiometricDevicesPanel } from '@/components/features/biometric/BiometricDevicesPanel';

export default async function CollegeAttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, context } = await requireCollegeContext('attendance.read', 'attendance');
  if (!context) redirect('/college-admin');
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || '') ? params.date! : new Date().toISOString().slice(0, 10);
  const data = await getCollegeAttendance(supabase, context, date);
  const canManage = hasCollegePermission(context, 'attendance.manage');
  const canManageStaff = ['owner', 'admin'].includes(context.membership.member_role);
  const biometricDevices = canManageStaff ? await listBiometricDevices('college', context.organization.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-1 text-sm">Daily student attendance, late arrivals, absences, and leave decisions.</p>
      </div>
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Scan a handwritten register</CardTitle></CardHeader>
          <CardContent>
            <CollegeAttendanceScanUploader sections={data.sections} date={date} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily register</CardTitle></CardHeader>
        <CardContent>
          <CollegeAttendanceRegister {...data} canManage={canManage} />
        </CardContent>
      </Card>
      {canManageStaff && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff attendance</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {data.staffMembers.length} active staff. Manual staff attendance marking UI wasn&apos;t ported for
            college yet (school&apos;s StaffAttendanceRegister is school-specific) — flagged as a follow-up.
            The ZKTeco biometric sync below writes to college_staff_attendance directly either way.
          </CardContent>
        </Card>
      )}
      {canManageStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biometric devices (ZKTeco)</CardTitle>
          </CardHeader>
          <CardContent>
            <BiometricDevicesPanel
              institutionType="college"
              organizationId={context.organization.id}
              devices={biometricDevices}
              teachers={(data.staffMembers || []).map((member: any) => ({
                id: member.id,
                name: Array.isArray(member.profiles) ? member.profiles[0]?.full_name : member.profiles?.full_name,
              }))}
            />
          </CardContent>
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
                      <CollegeActionForm key={status} action={reviewCollegeLeaveRequest} submitLabel={status === 'approved' ? 'Approve' : 'Reject'} className="">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value={status} />
                      </CollegeActionForm>
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
