'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const TRACK_COLOR = 'hsl(var(--muted))';

/**
 * A single-value donut/ring stat card — e.g. "attendance today" or "fee collection" as a %.
 * First pie/donut chart in the school-erp dashboards (siblings like SchoolReportsDashboard use
 * BarChart) — kept inside the same card shell (`border-border bg-card`) and `--chart-*` token
 * palette so it reads as part of the same system, not a bolted-on skin.
 */
export function PercentRingCard({
  title,
  percent,
  centerLabel,
  subLabel,
  colorVar = '--chart-2',
}: {
  title: string;
  percent: number; // 0-100
  centerLabel?: string;
  subLabel?: string;
  colorVar?: '--chart-1' | '--chart-2' | '--chart-3' | '--chart-4' | '--chart-5';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const data = [
    { name: 'filled', value: clamped },
    { name: 'rest', value: 100 - clamped },
  ];
  const color = `hsl(var(${colorVar}))`;

  return (
    <section className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="relative mt-2 h-48 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              innerRadius="70%"
              outerRadius="95%"
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={color} />
              <Cell fill={TRACK_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{clamped}%</span>
          {centerLabel && <span className="text-muted-foreground text-xs">{centerLabel}</span>}
        </div>
      </div>
      {subLabel && <p className="text-muted-foreground mt-2 text-center text-xs">{subLabel}</p>}
    </section>
  );
}
