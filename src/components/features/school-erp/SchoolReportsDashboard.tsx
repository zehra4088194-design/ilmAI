'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function SchoolReportsDashboard({
  attendance,
  invoices,
  reportCards,
  admissions,
}: {
  attendance: any[];
  invoices: any[];
  reportCards: any[];
  admissions: any[];
}) {
  const attendanceCounts = ['present', 'absent', 'late', 'excused', 'leave'].map((status) => ({
    name: status[0]!.toUpperCase() + status.slice(1),
    value: attendance.filter((item) => item.status === status).length,
  }));
  const feeData = ['paid', 'partial', 'issued', 'overdue'].map((status) => ({
    name: status[0]!.toUpperCase() + status.slice(1),
    amount: Math.round(
      invoices
        .filter((item) => item.status === status)
        .reduce((sum, item) => sum + Number(item.total_amount || 0) - Number(item.paid_amount || 0), 0)
    ),
  }));
  const admissionData = ['submitted', 'under_review', 'waitlisted', 'approved', 'enrolled', 'rejected'].map(
    (status) => ({
      name: status.replace('_', ' '),
      value: admissions.filter((item) => item.status === status).length,
    })
  );
  const averageResult = reportCards.length
    ? Math.round(reportCards.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / reportCards.length)
    : 0;

  const charts = [
    { title: 'Attendance, last 30 days', data: attendanceCounts, key: 'value', color: '#10b981' },
    { title: 'Outstanding fees', data: feeData, key: 'amount', color: '#f59e0b' },
    { title: 'Admission pipeline', data: admissionData, key: 'value', color: '#6366f1' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Average published result</p>
          <p className="mt-1 text-2xl font-bold">{averageResult}%</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Published report cards</p>
          <p className="mt-1 text-2xl font-bold">{reportCards.length}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Attendance records analyzed</p>
          <p className="mt-1 text-2xl font-bold">{attendance.length}</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {charts.map((chart) => (
          <section key={chart.title} className="border-border bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold">{chart.title}</h2>
            <div className="mt-4 h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} margin={{ top: 4, right: 4, left: -22, bottom: 26 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" interval={0} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey={chart.key} fill={chart.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
