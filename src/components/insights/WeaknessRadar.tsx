'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type WeaknessRadarPoint = {
  label: string;
  confidence: number;
};

export function WeaknessRadar({ data }: { data: WeaknessRadarPoint[] }) {
  const chartData = data.slice(0, 8).map((item) => ({
    ...item,
    weakness: 100 - item.confidence,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Complete a quiz to build your weakness map.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value: number) => [`${Math.round(value)}%`, 'Weakness']}
          />
          <Bar dataKey="weakness" radius={[0, 6, 6, 0]} fill="hsl(var(--chart-1))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
