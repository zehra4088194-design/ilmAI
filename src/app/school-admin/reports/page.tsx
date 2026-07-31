import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { SchoolReportsDashboard } from '@/components/features/school-erp/SchoolReportsDashboard';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolReports } from '@/lib/school-erp/queries';

export default async function SchoolReportsPage() {
  const { supabase, context } = await requireSchoolContext('reports.read');
  if (!context) redirect('/school-admin');
  const data = await getSchoolReports(supabase, context);
  const canReadAudit = hasSchoolPermission(context, 'audit.read');

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
