import { CalendarDays, CircleDollarSign, ClipboardList, GraduationCap, Sparkles, UserRoundCheck, Users2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolMetric } from '@/components/features/school-erp/SchoolMetric';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { AbsenceAlertWidget } from '@/components/features/school-erp/AbsenceAlertWidget';
import { PercentRingCard } from '@/components/features/school-erp/PercentRingCard';
import { RecentFeePaymentsList, type RecentFeePayment } from '@/components/features/school-erp/RecentFeePaymentsList';
import { ClassOverviewList, type ClassOverviewRow } from '@/components/features/school-erp/ClassOverviewList';
import { ReportsQuickLinks } from '@/components/features/school-erp/ReportsQuickLinks';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolFees, getSchoolOverview, getSchoolPeople, getTodayAbsences } from '@/lib/school-erp/queries';

export default async function SchoolAdminPage() {
  const { supabase, context } = await requireSchoolContext('dashboard.read');
  if (!context) redirect('/dashboard');
  const canManageExams = hasSchoolPermission(context, 'exams.manage');
  const canReadFees = hasSchoolPermission(context, 'fees.read');
  const canReadPeople = hasSchoolPermission(context, 'people.read');

  const [overview, absences, fees, people] = await Promise.all([
    getSchoolOverview(supabase, context),
    getTodayAbsences(supabase, context),
    canReadFees ? getSchoolFees(supabase, context) : Promise.resolve(null),
    canReadPeople ? getSchoolPeople(supabase, context) : Promise.resolve(null),
  ]);

  const presentToday = Math.max(0, overview.counts.students - overview.counts.absentToday);
  const attendancePercent = overview.counts.students > 0 ? (presentToday / overview.counts.students) * 100 : 0;

  let feePercent = 0;
  let recentPayments: RecentFeePayment[] = [];
  if (fees) {
    const totalDue = fees.invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || 0), 0);
    const totalPaid = fees.invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.paid_amount || 0), 0);
    feePercent = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    const studentNameByInvoiceId = new Map<string, string>();
    for (const invoice of fees.invoices) {
      const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
      studentNameByInvoiceId.set(invoice.id, profile?.full_name || 'Student');
    }
    recentPayments = fees.payments.slice(0, 5).map((payment: any) => {
      const invoiceLink = Array.isArray(payment.school_fee_invoices)
        ? payment.school_fee_invoices[0]
        : payment.school_fee_invoices;
      return {
        id: payment.id,
        studentName: studentNameByInvoiceId.get(payment.invoice_id) || 'Student',
        amount: Number(payment.amount || 0),
        paidAt: payment.paid_at,
        voucherNumber: invoiceLink?.voucher_number || null,
      };
    });
  }

  let classOverview: ClassOverviewRow[] = [];
  if (people) {
    const sectionInfo = new Map<string, { className: string }>();
    for (const section of people.sections) {
      const klass = Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes;
      sectionInfo.set(section.id, { className: [klass?.name, section.name].filter(Boolean).join(' - ') });
    }
    const counts = new Map<string, number>();
    for (const enrollment of people.enrollments) {
      if (enrollment.status && enrollment.status !== 'active') continue;
      const sectionId = enrollment.section_id;
      if (!sectionId) continue;
      counts.set(sectionId, (counts.get(sectionId) || 0) + 1);
    }
    classOverview = Array.from(counts.entries())
      .map(([sectionId, count]) => ({
        id: sectionId,
        className: sectionInfo.get(sectionId)?.className || 'Unassigned',
        studentCount: count,
      }))
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 6);
  }

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
      {canManageExams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a test</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/school-admin/tests">
                <Sparkles className="h-4 w-4" /> AI Test Studio
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/school-admin/exams">
                <GraduationCap className="h-4 w-4" /> Formal exam & marks
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
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
      <div className="grid gap-4 lg:grid-cols-2">
        <PercentRingCard
          title="Attendance — today"
          percent={attendancePercent}
          centerLabel="present"
          subLabel={`${presentToday} of ${overview.counts.students} students present`}
          colorVar="--chart-3"
        />
        {fees && (
          <PercentRingCard
            title="Fee collection"
            percent={feePercent}
            centerLabel="collected"
            subLabel="Share of total invoiced amount collected so far"
            colorVar="--chart-4"
          />
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Absence alerts — today</CardTitle>
        </CardHeader>
        <CardContent>
          <AbsenceAlertWidget absences={absences} />
        </CardContent>
      </Card>
      {(fees || people) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {fees && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent fee payments</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentFeePaymentsList payments={recentPayments} />
              </CardContent>
            </Card>
          )}
          {people && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Class overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ClassOverviewList classes={classOverview} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsQuickLinks />
        </CardContent>
      </Card>
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
