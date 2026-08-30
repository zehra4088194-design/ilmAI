import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CalendarCheck2, CalendarDays, GraduationCap, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolMetric } from '@/components/features/school-erp/SchoolMetric';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { ParentTeacherMessenger } from '@/components/features/school-erp/ParentTeacherMessenger';
import { createCollegeContactMessage, createCollegeLeaveRequest } from '@/lib/college-erp/actions';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeParentMessagingContacts, getCollegePortalData } from '@/lib/college-erp/queries';

// Mirrors src/app/school/page.tsx, minus the PTM (parent-teacher meeting) section — that subsystem
// was never ported for college (see docs/SCHOOL_COLLEGE_SEPARATION_TODO.md).
function relationName(value: any) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name || 'Student';
}

export default async function CollegePortalPage() {
  const { user, supabase, context } = await requireCollegeContext('dashboard.read');
  if (!user) redirect('/login?redirect=%2Fcollege');
  if (!context) redirect('/dashboard');
  const data = await getCollegePortalData(supabase, context);
  const role = context.membership.member_role;
  const messagingContacts = role === 'parent' ? await getCollegeParentMessagingContacts(supabase, context) : [];
  // No org-switcher UI yet for college (school's SchoolOrganizationSwitcher wasn't ported) — a
  // member of more than one college organization only sees their highest-priority one for now.
  const absent = data.attendance.filter((item: any) => item.status === 'absent').length;
  const present = data.attendance.filter((item: any) => item.status === 'present').length;
  const attendanceRate = present + absent ? Math.round((present / (present + absent)) * 100) : 0;
  const outstanding = data.invoices.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.total_amount || 0) - Number(item.paid_amount || 0)), 0);

  return (
    <main className="bg-background min-h-screen">
      <div className="border-border bg-card/80 sticky top-0 z-30 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            {context.organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={context.organization.logo_url} alt={context.organization.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Building2 className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-lg leading-tight font-extrabold sm:text-xl">{context.organization.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs font-semibold whitespace-nowrap">x ilm AI</span>
              </span>
              <span className="text-muted-foreground block text-[11px] capitalize">{role} portal</span>
            </span>
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{role === 'parent' ? 'Family college portal' : 'My college portal'}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Attendance, results, fees, assignments, timetable, and college alerts.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SchoolMetric label="Attendance rate" value={`${attendanceRate}%`} icon={CalendarCheck2} />
          <SchoolMetric label="Published reports" value={data.reportCards.length} icon={GraduationCap} tone="bg-violet-500/10 text-violet-600" />
          <SchoolMetric label="Assignments" value={data.assignments.length} icon={CalendarDays} tone="bg-sky-500/10 text-sky-600" />
          <SchoolMetric label="Outstanding fees" value={`${context.organization.currency} ${outstanding.toLocaleString()}`} icon={ReceiptText} tone="bg-amber-500/10 text-amber-600" />
        </div>
        {role === 'parent' && data.students.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.students.map((student: any) => (<Badge key={student.id} variant="secondary">{student.full_name}</Badge>))}
          </div>
        )}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Assignments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.assignments.map((item: any) => (
                <div key={item.id} className="border-border rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge variant="outline">{item.college_sections?.name || 'Section'}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{item.instructions || 'No extra instructions.'}</p>
                  <p className="text-muted-foreground mt-2 text-[11px]">{item.due_at ? `Due ${new Date(item.due_at).toLocaleString()}` : 'No due date'}</p>
                </div>
              ))}
              {!data.assignments.length && <p className="text-muted-foreground text-sm">No current assignments.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Latest attendance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.attendance.slice(0, 20).map((item: any) => (
                <div key={item.id} className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0">
                  <span>
                    <span className="block text-sm font-medium">{relationName(item.profiles)}</span>
                    <span className="text-muted-foreground text-xs">{item.attendance_date}</span>
                  </span>
                  <Badge variant={item.status === 'present' ? 'secondary' : item.status === 'absent' ? 'destructive' : 'outline'}>{item.status}</Badge>
                </div>
              ))}
              {!data.attendance.length && <p className="text-muted-foreground text-sm">No attendance records yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Results and report cards</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.reportCards.map((item: any) => (
                <Link href={`/college/report-card/${item.id}`} key={item.id} className="border-border hover:bg-muted/30 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">{item.college_exams?.name || 'Exam'}</p>
                    <p className="text-muted-foreground mt-1 text-xs">Grade {item.grade || '-'} - GPA {item.gpa ?? '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{Number(item.percentage).toFixed(1)}%</p>
                    <p className="text-muted-foreground text-[11px]">Position {item.class_position || '-'}</p>
                  </div>
                </Link>
              ))}
              {!data.reportCards.length && <p className="text-muted-foreground text-sm">No published report cards.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Fee vouchers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.invoices.map((item: any) => (
                <div key={item.id} className="border-border grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">{item.voucher_number}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{relationName(item.profiles)} - Due {item.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{context.organization.currency} {Number(item.total_amount).toLocaleString()}</p>
                    <Badge variant={item.status === 'paid' ? 'secondary' : item.status === 'overdue' ? 'destructive' : 'outline'}>{item.status}</Badge>
                    {['student', 'parent'].includes(role) && item.status !== 'paid' && item.status !== 'cancelled' && (
                      <Link href={`/college/fees/${item.id}`} className="mt-1 block text-xs font-semibold text-emerald-600 underline">
                        Pay now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {!data.invoices.length && <p className="text-muted-foreground text-sm">No fee vouchers.</p>}
            </CardContent>
          </Card>
        </div>
        {role === 'parent' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Message a teacher</CardTitle></CardHeader>
            <CardContent>
              <ParentTeacherMessenger
                contacts={messagingContacts}
                organizationId={context.organization.id}
                currentUserId={context.userId}
                contextType="college"
              />
            </CardContent>
          </Card>
        )}
        {['student', 'parent'].includes(role) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Contact college</CardTitle></CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <CollegeActionForm action={createCollegeContactMessage} submitLabel="Send message">
                <select name="recipient_role" className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm">
                  <option value="admin">College office</option>
                  <option value="admissions">Admissions</option>
                  <option value="teacher">Teachers</option>
                  <option value="accountant">Accounts office</option>
                </select>
                <Input name="subject" placeholder="Subject" maxLength={160} required />
                <Textarea name="body" placeholder="Message" maxLength={3000} rows={4} required />
              </CollegeActionForm>
              <div className="space-y-2">
                {data.messages.map((item: any) => (
                  <div key={item.id} className="border-border rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.subject}</p><Badge variant="outline">{item.status}</Badge></div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.body}</p>
                    {item.response && <p className="bg-muted/40 mt-2 rounded-md p-2 text-xs"><strong>Response:</strong> {item.response}</p>}
                  </div>
                ))}
                {!data.messages.length && <p className="text-muted-foreground text-sm">No messages yet.</p>}
              </div>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly timetable</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const entries = data.timetable.filter((item: any) => item.day_of_week === index + 1);
                if (!entries.length) return null;
                return (
                  <div key={day}>
                    <p className="text-muted-foreground mb-1 text-xs font-semibold">{day}</p>
                    <div className="space-y-1">
                      {entries.map((item: any) => (
                        <div key={item.id} className="bg-muted/40 grid grid-cols-[90px_1fr_auto] items-center gap-2 rounded-md px-3 py-2 text-xs">
                          <span className="font-mono">{String(item.starts_at).slice(0, 5)}-{String(item.ends_at).slice(0, 5)}</span>
                          <span className="truncate font-medium">{item.course_name}</span>
                          <span className="text-muted-foreground">{item.room || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!data.timetable.length && <p className="text-muted-foreground text-sm">No timetable published.</p>}
            </CardContent>
          </Card>
          {['student', 'parent', 'teacher', 'staff'].includes(role) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Leave request</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <CollegeActionForm action={createCollegeLeaveRequest} submitLabel="Submit request" className="grid gap-3 sm:grid-cols-2">
                  {role === 'parent' && (
                    <select name="student_id" required className="border-input bg-background h-10 rounded-lg border px-3 text-sm sm:col-span-2">
                      <option value="">Select student</option>
                      {data.students.map((student: any) => (<option key={student.id} value={student.id}>{student.full_name}</option>))}
                    </select>
                  )}
                  <Input name="starts_on" type="date" required />
                  <Input name="ends_on" type="date" required />
                  <Textarea name="reason" placeholder="Reason for leave" required className="sm:col-span-2" />
                </CollegeActionForm>
                <div className="space-y-2">
                  {data.leaves.map((item: any) => (
                    <div key={item.id} className="border-border flex items-center justify-between gap-3 border-t pt-2 text-xs">
                      <span>{item.starts_on} to {item.ends_on}</span>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.announcements.map((item: any) => (
                <article key={item.id} className="border-border rounded-lg border p-3">
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority}</Badge></div>
                  <p className="text-muted-foreground mt-2 text-sm">{item.body}</p>
                </article>
              ))}
              {!data.announcements.length && <p className="text-muted-foreground text-sm">No announcements.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming calendar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.events.map((item: any) => (
                <div key={item.id} className="border-border flex items-center gap-3 border-b py-2 last:border-0">
                  <CalendarDays className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-xs">{new Date(item.starts_at).toLocaleDateString()}</span>
                </div>
              ))}
              {!data.events.length && <p className="text-muted-foreground text-sm">No upcoming events.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
