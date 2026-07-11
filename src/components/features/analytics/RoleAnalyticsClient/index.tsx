'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, CalendarDays, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Point = { label: string; value: number; secondary?: number };

export function RoleAnalyticsClient({
  title,
  subtitle,
  cards,
  trend,
  bars,
  omitted = [],
}: {
  title: string;
  subtitle: string;
  cards: Array<{ label: string; value: string | number; detail?: string }>;
  trend: Point[];
  bars: Point[];
  omitted?: string[];
}) {
  const icons = [Activity, Trophy, CalendarDays, BarChart3];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">Analytics</Badge>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = icons[index % icons.length] || Activity;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <Icon className="mb-3 h-5 w-5 text-violet-400" />
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.detail && <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {omitted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Gracefully omitted</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Missing source tables/config ke wajah se ye sections hide kiye gaye: {omitted.join(', ')}.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
