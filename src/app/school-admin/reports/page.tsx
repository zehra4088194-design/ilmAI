import { redirect } from 'next/navigation';
import { Download, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrincipalAiSummary } from '@/components/features/school-erp/PrincipalAiSummary';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { SchoolReportsDashboard } from '@/components/features/school-erp/SchoolReportsDashboard';
import { ReportCardActions } from '@/components/features/school-erp/ReportCardActions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getDropoutRiskScores, getSchoolReports, getTeacherPerformanceInsights } from '@/lib/school-erp/queries';

export default async function SchoolReportsPage() {
  const { supabase, context } = await requireSchoolContext('reports.read', 'reports');
  if (!context) redirect('/school-admin');
  const data = await getSchoolReports(supabase, context);
  const canReadAudit = hasSchoolPermission(context, 'audit.read');
  const canEmailReportCards = hasSchoolPermission(context, 'exams.manage');
  // Phase 6a/6f: principal-facing only (owner/admin), same role gate the audit log below already uses.
  const isPrincipal = ['owner', 'admin'].includes(context.membership.member_role);
  const [teacherInsights, dropoutRisks] = isPrincipal
    ? await Promise.all([getTeacherPerformanceInsights(supabase, context), getDropoutRiskScores(supabase, context)])
    : [[], []];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Reports & analytics"
        description="Attendance, finance, admissions, academic performance, and auditable operations."
        action={
          <div className="flex flex-wrap gap-2">
            {['attendance', 'fees', 'results', 'admissions'].map((type) => (
              <a key={type} href={`/api/school-admin/reports/export?type=${type}`} className="border-input bg-background hover:bg-accent inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium capitalize">
                <Download className="mr-1.5 h-3.5 w-3.5" />{type}
              </a>
            ))}
          </div>
        }
      />
      <PrincipalAiSummary />
      <SchoolReportsDashboard attendance={data.attendance} invoices={data.invoices} reportCards={data.reportCards} admissions={data.admissions} />
      <Card>
        <CardHeader><CardTitle className="text-base">Term-end report cards</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.reportCards.slice(0, 30).map((item: any) => {
            const student = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return (
              <div key={item.id} className="border-border flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                <span className="min-w-0 flex-1 truncate font-medium">{student?.full_name || 'Student'}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{item.percentage}% · {item.grade}</span>
                <ReportCardActions reportCardId={item.id} canEmail={canEmailReportCards} />
              </div>
            );
          })}
          {!data.reportCards.length && <p className="text-muted-foreground text-sm">No published report cards yet.</p>}
        </CardContent>
      </Card>
      {isPrincipal && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5 text-base"><Sparkles className="h-4 w-4 text-violet-500" />Teacher performance (30 days)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {teacherInsights.map((t: any) => (
                <div key={t.profileId} className="border-border flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.fullName}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{t.attendanceDaysMarked} attendance day(s) · {t.testsCreated} test(s) created</span>
                </div>
              ))}
              {!teacherInsights.length && <p className="text-muted-foreground text-sm">No teacher activity in this window.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5 text-base"><ShieldAlert className="h-4 w-4 text-rose-500" />Dropout-risk early warning</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {dropoutRisks.slice(0, 20).map((s: any) => (
                <div key={s.studentId} className="border-border flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                  <span className="min-w-0 flex-1 truncate font-medium">{s.fullName}</span>
                  <span className="text-muted-foreground shrink-0 text-[11px]">{s.attendanceRate}% attendance{s.overdueInvoices > 0 ? ` · ${s.overdueInvoices} overdue fee(s)` : ''}{s.decliningQuizTrend ? ' · declining scores' : ''}</span>
                  <Badge variant={s.riskScore >= 60 ? 'destructive' : s.riskScore >= 30 ? 'warning' : 'outline'} className="shrink-0">{s.riskScore}</Badge>
                </div>
              ))}
              {!dropoutRisks.length && <p className="text-muted-foreground text-sm">No at-risk students detected.</p>}
            </CardContent>
          </Card>
        </div>
      )}
      {canReadAudit && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent audit log</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Actor</th></tr></thead>
              <tbody>{data.auditLogs.map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="py-2">{new Date(item.created_at).toLocaleString()}</td><td>{item.action}</td><td>{item.entity_type}</td><td className="font-mono text-xs">{item.entity_id || '-'}</td><td className="font-mono text-xs">{item.actor_user_id?.slice(0, 8) || 'system'}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
