import Link from 'next/link';
import { CalendarDays, CircleDollarSign, ClipboardList, GraduationCap, Inbox, UserRoundCheck, Video, FileText, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolMetric } from '@/components/features/school-erp/SchoolMetric';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { AbsenceAlertWidget } from '@/components/features/school-erp/AbsenceAlertWidget';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import { getPendingJoinRequests, getCollegeLectures, getCollegeResources, getApprovedStudents } from '@/lib/college/queries';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeOverview, getCollegeTodayAbsences } from '@/lib/college-erp/queries';

export const metadata = { title: 'College Admin | ilm AI' };

export default async function CollegeAdminHomePage() {
  const { supabase, context: newContext } = await requireCollegeContext('dashboard.read');
  if (newContext) {
    const [overview, absences] = await Promise.all([
      getCollegeOverview(supabase, newContext),
      getCollegeTodayAbsences(supabase, newContext),
    ]);
    // AbsenceAlertWidget's props (studentName/className/guardianPhone/guardianName/id/status) are
    // identical in shape to CollegeAbsenceAlertRow (sectionName vs className is the only rename) —
    // reused directly rather than building a college-specific twin.
    const absenceRows = absences.map((row) => ({
      id: row.id,
      status: row.status,
      studentId: row.studentId,
      studentName: row.studentName,
      className: row.sectionName,
      guardianPhone: row.guardianPhone,
      guardianName: row.guardianName,
    }));

    return (
      <div className="space-y-6">
        <SchoolPageHeader
          title="College overview"
          description={`${newContext.organization.name} operations for the current academic cycle.`}
          action={
            <Badge variant="outline" className="capitalize">
              {newContext.membership.member_role}
            </Badge>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SchoolMetric label="Active students" value={overview.counts.students} icon={GraduationCap} />
          <SchoolMetric label="Staff members" value={overview.counts.staff} icon={UserRoundCheck} tone="bg-sky-500/10 text-sky-600" />
          <SchoolMetric label="Pending admissions" value={overview.counts.pendingAdmissions} icon={ClipboardList} tone="bg-violet-500/10 text-violet-600" />
          <SchoolMetric label="Absent or late today" value={overview.counts.absentToday} icon={CalendarDays} tone="bg-amber-500/10 text-amber-600" />
          <SchoolMetric label="Fee follow-ups" value={overview.counts.overdueInvoices} icon={CircleDollarSign} tone="bg-rose-500/10 text-rose-600" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Absence alerts — today</CardTitle>
          </CardHeader>
          <CardContent>
            <AbsenceAlertWidget absences={absenceRows} />
          </CardContent>
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.announcements.map((item: any) => (
                <div key={item.id} className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority}</Badge>
                </div>
              ))}
              {!overview.announcements.length && <p className="text-muted-foreground text-sm">No published announcements.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.events.map((item: any) => (
                <div key={item.id} className="border-border flex items-center gap-3 border-b py-2 last:border-0">
                  <CalendarDays className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-xs">{new Date(item.starts_at).toLocaleDateString()}</span>
                </div>
              ))}
              {!overview.events.length && <p className="text-muted-foreground text-sm">No upcoming events.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Legacy dashboard (colleges provisioned under the old schema) — unchanged.
  const supabaseLegacy = await createClient();
  const {
    data: { user },
  } = await supabaseLegacy.auth.getUser();
  if (!user) return null;
  const legacyContext = await getCollegeAdminContext(supabaseLegacy, user.id);
  if (!legacyContext) return null;
  const admin = await createAdminClient();

  const [pending, lectures, resources, students] = await Promise.all([
    getPendingJoinRequests(supabaseLegacy, legacyContext.college.id),
    getCollegeLectures(supabaseLegacy, legacyContext.college.id),
    getCollegeResources(admin, legacyContext.college.id),
    getApprovedStudents(supabaseLegacy, legacyContext.college.id),
  ]);

  const cards = [
    { href: '/college-admin/requests', label: 'Pending requests', value: pending.length, icon: Inbox },
    { href: '/college-admin/lectures', label: 'Lectures', value: lectures.length, icon: Video },
    { href: '/college-admin/resources', label: 'Resources', value: resources.length, icon: FileText },
    { href: '/college-admin/students', label: 'Students', value: students.length, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Welcome back</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="glass border-border/60 bg-card/60 flex flex-col gap-2 rounded-2xl border p-5 backdrop-blur-xl transition-shadow hover:shadow-md"
          >
            <card.icon className="text-muted-foreground h-5 w-5" />
            <span className="text-2xl font-bold">{card.value}</span>
            <span className="text-muted-foreground text-sm">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
