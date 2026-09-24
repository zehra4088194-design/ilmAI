'use client';

import { useActionState, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveStaffAttendance } from '@/lib/school-erp/actions';
import { INITIAL_SCHOOL_ACTION_STATE } from '@/lib/school-erp/types';

const STATUSES = ['present', 'absent', 'late', 'remote', 'leave'];

export function StaffAttendanceRegister({
  members,
  records,
  date,
}: {
  members: any[];
  records: any[];
  date: string;
}) {
  const initial = useMemo(
    () => Object.fromEntries(records.map((record) => [record.membership_id, record.status])),
    [records],
  );
  const [statuses, setStatuses] = useState<Record<string, string>>(initial);
  const [state, action, pending] = useActionState(saveStaffAttendance, INITIAL_SCHOOL_ACTION_STATE);
  const entries = members.map((member) => ({
    membershipId: member.id,
    status: statuses[member.id] || 'present',
  }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="attendance_date" value={date} />
      <input type="hidden" name="entries" value={JSON.stringify(entries)} />
      <div className="border-border divide-border overflow-hidden rounded-lg border divide-y">
        {members.map((member) => {
          const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
          return (
            <div key={member.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_180px] sm:items-center">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{profile?.full_name || 'Staff member'}</p><p className="text-muted-foreground text-xs capitalize">{member.member_role} {member.employee_code ? `- ${member.employee_code}` : ''}</p></div>
              <select value={statuses[member.id] || 'present'} onChange={(event) => setStatuses((current) => ({ ...current, [member.id]: event.target.value }))} className="border-input bg-background h-9 rounded-lg border px-3 text-sm">
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={pending || !members.length}><Save className="mr-2 h-4 w-4" />{pending ? 'Saving...' : 'Save staff attendance'}</Button>{state.message && <p className={state.success ? 'text-xs text-emerald-600' : 'text-destructive text-xs'}>{state.message}</p>}</div>
    </form>
  );
}
