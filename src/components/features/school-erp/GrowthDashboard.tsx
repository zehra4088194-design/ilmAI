'use client';

// Shared by /school-admin/growth and /college-admin/growth — the underlying data shape
// (src/lib/school-erp/growth.ts) is identical for both, only the query that fills it differs.

import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GrowthInsights } from '@/lib/school-erp/growth';

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 45) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function GrowthDashboard({ data, studentNoun = 'student' }: { data: GrowthInsights; studentNoun?: string }) {
  const { summary, recommendations } = data;
  const netUp = summary.netChange >= 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Growth score</p>
            <p className={`mt-1 text-3xl font-bold ${scoreColor(data.growthScore)}`}>{data.growthScore}</p>
            <p className="text-muted-foreground mt-1 text-[11px]">Attendance + fee recovery + net enrollment, blended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Active {studentNoun}s</p>
            <p className="mt-1 text-2xl font-bold">{summary.activeStudents}</p>
            <p className={`mt-1 flex items-center gap-1 text-[11px] ${netUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {netUp ? '+' : ''}
              {summary.netChange} net over 6 months
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Avg attendance (6mo)</p>
            <p className="mt-1 text-2xl font-bold">{summary.avgAttendanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Avg fee recovery (6mo)</p>
            <p className="mt-1 text-2xl font-bold">{summary.avgFeeRecoveryPct}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Admissions vs withdrawals</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.admissionsVsWithdrawals} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="admissions" name="Admissions" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Attendance trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.attendanceTrend} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={10} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee recovery %</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.feeRecovery} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={10} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="recoveryPct" name="Recovery %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1.5 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Recommended actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((item, index) => (
            <div key={index} className="border-border flex items-start gap-2 border-b py-2 text-sm last:border-0">
              <Badge variant="outline" className="mt-0.5 shrink-0">{index + 1}</Badge>
              <p>{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
