import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolReportsDashboard } from '@/components/features/school-erp/SchoolReportsDashboard';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeReports } from '@/lib/college-erp/queries';

export default async function CollegeReportsPage() {
  const { supabase, context } = await requireCollegeContext('reports.read', 'reports');
  if (!context) redirect('/college-admin');
  const data = await getCollegeReports(supabase, context);
  const canReadAudit = hasCollegePermission(context, 'audit.read');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Attendance, finance, admissions, and academic performance. CSV export and the AI monthly
          summary weren&apos;t ported for college yet (school-only routes) — flagged as a follow-up.
        </p>
      </div>
      <SchoolReportsDashboard attendance={data.attendance} invoices={data.invoices} reportCards={data.reportCards} admissions={data.admissions} />
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
