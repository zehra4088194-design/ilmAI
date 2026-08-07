import { redirect } from 'next/navigation';
import { CalendarClock, Users2, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolMetric } from '@/components/features/school-erp/SchoolMetric';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { closePtmSlot, createPtmSlot, requestPtm, respondPtmRequest, updatePtmOutcome } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolPtm } from '@/lib/school-erp/queries';

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' {
  if (status === 'scheduled') return 'success';
  if (status === 'approved') return 'info';
  if (status === 'completed') return 'secondary';
  if (status === 'cancelled' || status === 'missed') return 'destructive';
  if (status === 'rescheduled') return 'warning';
  return 'outline';
}

function PtmRequestRow({
  item,
  canManage,
  showOutcome = false,
}: {
  item: any;
  canManage: boolean;
  showOutcome?: boolean;
}) {
  const student = relation(item.student);
  const teacher = relation(item.teacher);
  const parent = relation(item.parent);
  return (
    <div className="border-border rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {student?.full_name || 'Student'} &middot; {teacher?.full_name || 'Teacher'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {item.starts_at ? new Date(item.starts_at).toLocaleString() : 'No time set yet'}
            {parent?.full_name ? ` - Requested by ${parent.full_name}` : ''}
          </p>
          {item.topic && <p className="text-muted-foreground mt-1 text-xs">Topic: {item.topic}</p>}
          {item.join_link && (
            <p className="mt-1 text-xs">
              <a href={item.join_link} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                Join link
              </a>
            </p>
          )}
          {item.location && <p className="text-muted-foreground mt-1 text-xs">Location: {item.location}</p>}
          {item.teacher_response && <p className="text-muted-foreground mt-1 text-xs">Note: {item.teacher_response}</p>}
        </div>
        <Badge variant={statusVariant(item.status)}>{item.status.replace('_', ' ')}</Badge>
      </div>
      {canManage && item.status === 'requested' && (
        <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
          <SchoolActionForm action={respondPtmRequest} submitLabel="Approve &amp; schedule" className="space-y-2">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="scheduled" />
            <Input name="starts_at" type="datetime-local" required />
            <Input name="join_link" placeholder="Zoom / Google Meet link" />
            <Input name="location" placeholder="Room (if in person)" />
            <Textarea name="teacher_response" placeholder="Note to parent (optional)" rows={2} />
          </SchoolActionForm>
          <SchoolActionForm action={respondPtmRequest} submitLabel="Decline" className="space-y-2">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="cancelled" />
            <Textarea name="teacher_response" placeholder="Reason (optional)" rows={2} />
          </SchoolActionForm>
        </div>
      )}
      {canManage && showOutcome && ['approved', 'scheduled'].includes(item.status) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          <SchoolActionForm action={updatePtmOutcome} submitLabel="Mark completed" className="">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="completed" />
          </SchoolActionForm>
          <SchoolActionForm action={updatePtmOutcome} submitLabel="Mark missed" className="">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="missed" />
          </SchoolActionForm>
        </div>
      )}
    </div>
  );
}

export default async function SchoolPtmPage() {
  const { supabase, context } = await requireSchoolContext('ptm.read');
  if (!context) redirect('/school-admin');
  const data = await getSchoolPtm(supabase, context);
  const role = context.membership.member_role;
  const canManage = hasSchoolPermission(context, 'ptm.manage');
  const canCreateDirect = ['owner', 'admin', 'teacher'].includes(role);

  const pending = data.requests.filter((item: any) => item.status === 'requested');
  const upcoming = data.requests.filter((item: any) => ['approved', 'scheduled'].includes(item.status));
  const history = data.requests.filter((item: any) =>
    ['completed', 'cancelled', 'missed', 'rescheduled'].includes(item.status)
  );
  const openSlots = data.slots.filter((slot: any) => slot.is_open);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Online PTM"
        description="Parent-teacher meeting requests, teacher availability, and scheduled sessions."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <SchoolMetric
          label="Pending requests"
          value={pending.length}
          icon={Users2}
          tone="bg-violet-500/10 text-violet-600"
        />
        <SchoolMetric
          label="Upcoming meetings"
          value={upcoming.length}
          icon={CalendarClock}
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <SchoolMetric
          label="Open availability slots"
          value={openSlots.length}
          icon={Video}
          tone="bg-sky-500/10 text-sky-600"
        />
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teacher availability</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <SchoolActionForm action={createPtmSlot} submitLabel="Add slot">
              {['owner', 'admin'].includes(role) && (
                <select
                  name="teacher_id"
                  required
                  className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="">Select teacher</option>
                  {data.teachers.map((item: any) => {
                    const profile = relation(item.profiles);
                    return (
                      <option key={item.profile_id} value={item.profile_id}>
                        {profile?.full_name || 'Teacher'}
                      </option>
                    );
                  })}
                </select>
              )}
              <Input name="starts_at" type="datetime-local" required />
              <Input name="ends_at" type="datetime-local" required />
              <select
                name="meeting_mode"
                defaultValue="online"
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="online">Online</option>
                <option value="in_person">In person</option>
              </select>
              <Input name="location" placeholder="Room (if in person)" />
              <Input
                name="max_participants"
                type="number"
                min={1}
                defaultValue={1}
                placeholder="Max bookings for this slot"
              />
              <Textarea name="notes" placeholder="Notes for parents (optional)" rows={2} />
            </SchoolActionForm>
            <div className="space-y-2">
              {data.slots.map((slot: any) => {
                const teacher = relation(slot.teacher);
                return (
                  <div
                    key={slot.id}
                    className="border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{teacher?.full_name || 'Teacher'}</p>
                        <Badge variant="outline">{slot.meeting_mode.replace('_', ' ')}</Badge>
                        {!slot.is_open && <Badge variant="destructive">closed</Badge>}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {new Date(slot.starts_at).toLocaleString()} - {new Date(slot.ends_at).toLocaleTimeString()} - up
                        to {slot.max_participants} booking(s)
                      </p>
                    </div>
                    {slot.is_open && (
                      <SchoolActionForm action={closePtmSlot} submitLabel="Close" className="">
                        <input type="hidden" name="id" value={slot.id} />
                      </SchoolActionForm>
                    )}
                  </div>
                );
              })}
              {!data.slots.length && <p className="text-muted-foreground text-sm">No availability slots yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canCreateDirect ? 'Request or schedule a meeting' : 'Request a meeting'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolActionForm
            action={requestPtm}
            submitLabel={canCreateDirect ? 'Submit' : 'Send request'}
            className="grid gap-3 sm:grid-cols-2"
          >
            <select
              name="teacher_id"
              required
              className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm sm:col-span-2"
            >
              <option value="">Select teacher</option>
              {data.teachers.map((item: any) => {
                const profile = relation(item.profiles);
                return (
                  <option key={item.profile_id} value={item.profile_id}>
                    {profile?.full_name || 'Teacher'}
                  </option>
                );
              })}
            </select>
            <select
              name="student_id"
              required
              className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm sm:col-span-2"
            >
              <option value="">Select student</option>
              {data.students.map((item: any) => {
                const profile = relation(item.profiles);
                const section = relation(item.school_sections);
                const cls = section ? relation(section.school_classes) : null;
                return (
                  <option key={item.student_id} value={item.student_id}>
                    {profile?.full_name || 'Student'}
                    {section ? ` - ${cls?.name || ''} ${section.name}` : ''}
                  </option>
                );
              })}
            </select>
            <Input name="topic" placeholder="Topic (optional)" className="sm:col-span-2" />
            {canCreateDirect && (
              <>
                <Input name="starts_at" type="datetime-local" />
                <select
                  name="meeting_mode"
                  defaultValue="online"
                  className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="online">Online</option>
                  <option value="in_person">In person</option>
                </select>
                <Input name="join_link" placeholder="Zoom / Google Meet link" className="sm:col-span-2" />
                <Input name="location" placeholder="Room (if in person)" className="sm:col-span-2" />
              </>
            )}
          </SchoolActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((item: any) => (
            <PtmRequestRow key={item.id} item={item} canManage={canManage} />
          ))}
          {!pending.length && <p className="text-muted-foreground text-sm">No pending requests.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming meetings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.map((item: any) => (
            <PtmRequestRow key={item.id} item={item} canManage={canManage} showOutcome />
          ))}
          {!upcoming.length && <p className="text-muted-foreground text-sm">No upcoming meetings.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.slice(0, 40).map((item: any) => {
            const student = relation(item.student);
            const teacher = relation(item.teacher);
            return (
              <div
                key={item.id}
                className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {student?.full_name || 'Student'} with {teacher?.full_name || 'Teacher'}
                </span>
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>
            );
          })}
          {!history.length && <p className="text-muted-foreground text-sm">No completed meetings yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
