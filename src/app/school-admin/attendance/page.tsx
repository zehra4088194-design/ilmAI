import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp';
import { AttendanceRegister } from '@/components/features/school-erp/AttendanceRegister';
import { AttendanceScanUploader } from '@/components/features/school-erp/AttendanceScanUploader';
import { StaffAttendanceRegister } from '@/components/features/school-erp/StaffAttendanceRegister';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { reviewLeaveRequest } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAttendance, getSubstituteSuggestions } from '@/lib/school-erp/queries';
import { listBiometricDevices } from '@/lib/biometric/actions';
import { BiometricDevicesPanel } from '@/components/features/biometric/BiometricDevicesPanel';

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
  const biometricDevices = canManageStaff ? await listBiometricDevices('school', context.organization.id) : [];
  const substituteSuggestions = canManageStaff ? await getSubstituteSuggestions(supabase, context, date) : [];

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Attendance" description="Daily student attendance, late arrivals, absences, and leave decisions." />
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Scan a handwritten register</CardTitle></CardHeader>
          <CardContent>
            <AttendanceScanUploader sections={data.sections} date={date} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily register</CardTitle></CardHeader>
        <CardContent>
          <AttendanceRegister {...data} canManage={canManage} />
        </CardContent>
      </Card>
      {canManage && data.absentees.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Absent today — notify guardians</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.absentees.map((absentee: any) => {
              const waLink = buildWhatsAppLink(
                absentee.guardianPhone,
                `${absentee.fullName} was marked absent today (${date}). Please contact the school office if this is incorrect.`
              );
              return (
                <div key={absentee.studentId} className="border-border flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                  <span className="min-w-0 flex-1 truncate font-medium">{absentee.fullName}</span>
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">
                      <MessageCircle className="h-3.5 w-3.5" />Send via WhatsApp
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">No guardian phone on file</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {canManageStaff && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff attendance</CardTitle></CardHeader>
          <CardContent><StaffAttendanceRegister members={data.staffMembers} records={data.staffRecords} date={date} /></CardContent>
        </Card>
      )}
      {canManageStaff && substituteSuggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Substitute suggestions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {substituteSuggestions.map((period: any) => (
              <div key={period.periodId} className="border-border rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{period.sectionName} · {period.subjectName || 'Class'}</p>
                  <Badge variant="outline">{String(period.startsAt).slice(0, 5)}-{String(period.endsAt).slice(0, 5)}</Badge>
                  <Badge variant="destructive">{period.absentTeacherName} absent</Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {period.suggestions.length
                    ? `Free substitutes: ${period.suggestions.map((s: any) => s.fullName).join(', ')}`
                    : 'No free teacher found for this period.'}
                </p>
              </div>
            ))}
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
              institutionType="school"
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
