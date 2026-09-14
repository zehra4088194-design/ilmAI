import Link from 'next/link';
import {
  Award,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Library,
  MessageCircle,
  ReceiptText,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type StudentHubKind = 'school' | 'college';

export type StudentHubProps = {
  kind: StudentHubKind;
  role: string;
  organization: { name: string; logo_url: string | null; currency: string };
  profile: { full_name: string | null; avatar_url: string | null };
  enrollment: {
    classLabel: string;
    sectionLabel: string;
    rollNumber: string | null;
    academicLabel: string | null;
    campusLabel: string | null;
  } | null;
  students?: { id: string; full_name: string | null }[];
  attendance: any[];
  reportCards: any[];
  invoices: any[];
  timetable: any[];
  assignments: any[];
  announcements: any[];
  events: any[];
  notifications: any[];
};

function relationName(value: any) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name || 'Student';
}

function classText(enrollment: StudentHubProps['enrollment']) {
  if (!enrollment) return 'Institution member';
  return [enrollment.classLabel, enrollment.sectionLabel].filter(Boolean).join(' • ') || 'Institution student';
}

export function InstitutionStudentHub({
  kind,
  role,
  organization,
  profile,
  enrollment,
  students = [],
  attendance,
  reportCards,
  invoices,
  timetable,
  assignments,
  announcements,
  events,
  notifications,
}: StudentHubProps) {
  const isParent = role === 'parent';
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const todaySlots = timetable.filter((item) => Number(item.day_of_week) === day);
  const present = attendance.filter((item) => ['present', 'late'].includes(item.status)).length;
  const counted = attendance.filter((item) => ['present', 'late', 'absent'].includes(item.status)).length;
  const attendanceRate = counted ? Math.round((present / counted) * 100) : 0;
  const latest = reportCards.slice(0, 3);
  const outstanding = invoices.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount || 0) - Number(item.paid_amount || 0)), 0);
  const pendingWork = assignments.filter((item) => !item.submission_status || item.submission_status !== 'submitted').slice(0, 6);
  const upcomingEvents = events.slice(0, 5);
  const noticeItems = announcements.slice(0, 5);
  const notificationItems = notifications.slice(0, 6);
  const pathRoot = kind === 'school' ? '/school' : '/college';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-600/15 via-background to-indigo-600/10 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name || 'Student'} className="h-16 w-16 rounded-2xl object-cover" />
            ) : organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.logo_url} alt={organization.name} className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black text-white">
                {(profile.full_name || organization.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-500">{organization.name} · ilm AI</p>
              <h1 className="mt-1 truncate text-2xl font-black md:text-3xl">Welcome back, {profile.full_name || 'Student'}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{classText(enrollment)}{enrollment?.academicLabel ? ` • ${enrollment.academicLabel}` : ''}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {enrollment?.rollNumber && <Badge variant="outline">Roll {enrollment.rollNumber}</Badge>}
                {enrollment?.campusLabel && <Badge variant="outline">{enrollment.campusLabel}</Badge>}
                <Badge variant="secondary">{role}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/notifications"><Bell className="h-4 w-4" /> Notifications</Link></Button>
            <Button asChild size="sm" variant="gradient"><Link href="/ai-tutor"><Sparkles className="h-4 w-4" /> Ask AI</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarClock} label="Attendance" value={`${attendanceRate}%`} />
        <Metric icon={TrendingUp} label="Latest result" value={latest[0] ? `${Number(latest[0].percentage || 0).toFixed(1)}%` : '—'} />
        <Metric icon={ReceiptText} label="Fees due" value={`${organization.currency} ${outstanding.toLocaleString()}`} />
        <Metric icon={FileText} label="Pending work" value={pendingWork.length} />
      </section>

      {isParent && students.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Children</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {students.map((student) => <Badge key={student.id} variant="secondary">{student.full_name || 'Student'}</Badge>)}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="text-base">Today&apos;s timetable</CardTitle><Button asChild size="sm" variant="outline"><Link href={`${pathRoot}#timetable`}>Full timetable</Link></Button></CardHeader>
          <CardContent className="space-y-2">
            {todaySlots.length ? todaySlots.map((item) => (
              <div key={item.id} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="font-mono text-xs">{String(item.starts_at).slice(0,5)}–{String(item.ends_at).slice(0,5)}</span>
                <span className="min-w-0 truncate font-semibold">{item.subject_name || item.course_name || 'Class'}</span>
                <span className="text-muted-foreground text-xs">{item.room || item.profiles?.full_name || ''}</span>
              </div>
            )) : <Empty text="No classes are scheduled for today." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Attendance snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between"><span className="text-3xl font-black">{attendanceRate}%</span><span className="text-muted-foreground text-xs">last {attendance.length} recorded entries</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, attendanceRate)}%` }} /></div>
            <div className="grid grid-cols-2 gap-2 text-xs"><Mini label="Present/Late" value={present} /><Mini label="Absent" value={Math.max(0, counted-present)} /></div>
            <Link className="text-xs font-semibold text-primary underline" href={`${pathRoot}#attendance`}>View attendance history</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Upcoming exams & results</CardTitle><Button asChild size="sm" variant="outline"><Link href={`${pathRoot}#results`}>All results</Link></Button></CardHeader>
          <CardContent className="space-y-2">
            {latest.length ? latest.map((item) => (
              <Link key={item.id} href={`${pathRoot}/report-card/${item.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><GraduationCap className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.school_exams?.name || item.college_exams?.name || 'Published result'}</p><p className="text-muted-foreground text-xs">{Number(item.percentage || 0).toFixed(1)}% • Grade {item.grade || '—'} • GPA {item.gpa ?? '—'}</p></div>
                <Award className="h-4 w-4 text-amber-500" />
              </Link>
            )) : <Empty text="No published result yet." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Assignments</CardTitle><Button asChild size="sm" variant="outline"><Link href={`${pathRoot}#assignments`}>All work</Link></Button></CardHeader>
          <CardContent className="space-y-2">
            {pendingWork.length ? pendingWork.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Target className="mt-0.5 h-4 w-4 text-sky-500" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-muted-foreground text-xs">{item.due_at ? `Due ${new Date(item.due_at).toLocaleString()}` : 'No deadline'}</p></div>
                <Badge variant="warning">Pending</Badge>
              </div>
            )) : <Empty text="No pending assignments." />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Fee account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-amber-500/10 p-4"><p className="text-muted-foreground text-xs">Outstanding</p><p className="mt-1 text-2xl font-black">{organization.currency} {outstanding.toLocaleString()}</p></div>
            {invoices.slice(0,4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0"><span className="text-xs font-medium">{item.voucher_number || 'Voucher'}</span><span className="text-xs">{organization.currency} {Math.max(0, Number(item.total_amount)-Number(item.paid_amount)).toLocaleString()}</span></div>)}
            <Button asChild className="w-full" variant="outline"><Link href={`${pathRoot}/fees`}>Open fees & payment</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {noticeItems.length ? noticeItems.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-center gap-2"><Bell className="h-3.5 w-3.5" /><p className="truncate text-sm font-semibold">{item.title}</p><Badge className="ml-auto" variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority || 'notice'}</Badge></div><p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.body}</p></div>) : <Empty text="No current announcements." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notificationItems.length ? notificationItems.map((item) => <Link key={item.id} href={item.link || '/notifications'} className="flex items-start gap-2 rounded-lg border p-3 hover:bg-muted/40"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.title}</span><span className="text-muted-foreground block line-clamp-1 text-[11px]">{item.message}</span></span></Link>) : <Empty text="You are all caught up." />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="text-base flex items-center gap-2"><Library className="h-4 w-4" /> My Institution Library</CardTitle><Button asChild size="sm" variant="outline"><Link href={kind === 'school' ? '/school#library' : '/college#library'}>Open library</Link></Button></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink icon={BookOpen} title="Notes & Books" href="/library" />
          <QuickLink icon={FileText} title="Past Papers" href="/past-papers" />
          <QuickLink icon={CalendarClock} title="Today&apos;s Homework" href={`${pathRoot}/todays-homework`} />
          <QuickLink icon={Search} title="Search ilm AI" href="/library" />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming events</CardTitle></CardHeader>
          <CardContent className="space-y-2">{upcomingEvents.length ? upcomingEvents.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><Clock3 className="h-4 w-4 text-indigo-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-muted-foreground text-xs">{new Date(item.starts_at).toLocaleString()}</p></div><Badge variant="outline">{item.event_type || 'event'}</Badge></div>) : <Empty text="No upcoming events." />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">AI improvement coach</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Find your weakest topics automatically.</p><p className="text-muted-foreground mt-1 text-xs">Use your results and practice history to ask ilm AI what to study next.</p></div>
            <div className="flex gap-2"><Button asChild variant="outline"><Link href="/insights"><TrendingUp className="h-4 w-4" /> My insights</Link></Button><Button asChild variant="gradient"><Link href="/ai-tutor?q=What+are+my+weakest+topics%3F"><Sparkles className="h-4 w-4" /> Ask AI</Link></Button></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-black">{value}</p><p className="text-muted-foreground text-xs">{label}</p></div></div></div>;
}
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border p-2"><p className="font-semibold">{value}</p><p className="text-muted-foreground text-[10px]">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">{text}</p>; }
function QuickLink({ icon: Icon, title, href }: { icon: any; title: string; href: string }) { return <Link href={href} className="flex items-center gap-3 rounded-xl border p-4 transition hover:bg-muted/40"><Icon className="h-5 w-5 text-violet-500" /><span className="text-sm font-semibold">{title}</span></Link>; }
