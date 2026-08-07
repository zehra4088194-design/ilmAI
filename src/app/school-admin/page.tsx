import { CalendarDays, CircleDollarSign, ClipboardList, GraduationCap, UserRoundCheck, Users2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolMetric } from '@/components/features/school-erp/SchoolMetric';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolOverview } from '@/lib/school-erp/queries';

export default async function SchoolAdminPage() {
  const { supabase, context } = await requireSchoolContext('dashboard.read');
  if (!context) redirect('/dashboard');
  const overview = await getSchoolOverview(supabase, context);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="School overview"
        description={`${context.organization.name} operations for the current academic cycle.`}
        action={
          <Badge variant="outline" className="capitalize">
            {context.membership.member_role}
          </Badge>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SchoolMetric label="Active students" value={overview.counts.students} icon={GraduationCap} />
        <SchoolMetric
          label="Staff members"
          value={overview.counts.staff}
          icon={UserRoundCheck}
          tone="bg-sky-500/10 text-sky-600"
        />
        <SchoolMetric
          label="Pending admissions"
          value={overview.counts.pendingAdmissions}
          icon={ClipboardList}
          tone="bg-violet-500/10 text-violet-600"
        />
        <SchoolMetric
          label="Absent or late today"
          value={overview.counts.absentToday}
          icon={CalendarDays}
          tone="bg-amber-500/10 text-amber-600"
        />
        <SchoolMetric
          label="Fee follow-ups"
          value={overview.counts.overdueInvoices}
          icon={CircleDollarSign}
          tone="bg-rose-500/10 text-rose-600"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SchoolMetric
          label="Homework due this week"
          value={overview.counts.homeworkDueSoon}
          icon={ClipboardList}
          tone="bg-sky-500/10 text-sky-600"
        />
        <SchoolMetric
          label="PTM requests pending"
          value={overview.counts.ptmPending}
          icon={Users2}
          tone="bg-violet-500/10 text-violet-600"
        />
        <SchoolMetric
          label="PTM meetings upcoming"
          value={overview.counts.ptmUpcoming}
          icon={Users2}
          tone="bg-emerald-500/10 text-emerald-600"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.announcements.map((item: any) => (
              <div
                key={item.id}
                className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <span className="truncate text-sm font-medium">{item.title}</span>
                <Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority}</Badge>
              </div>
            ))}
            {!overview.announcements.length && (
              <p className="text-muted-foreground text-sm">No published announcements.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.events.map((item: any) => (
              <div key={item.id} className="border-border flex items-center gap-3 border-b py-2 last:border-0">
                <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
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
