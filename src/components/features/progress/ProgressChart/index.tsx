'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ProgressChart({ sessions }: { sessions: any[] }) {
  const chartData = sessions.slice(0, 7).reverse().map(s => ({
    date: new Date(s.date).toLocaleDateString('en-PK', { weekday: 'short' }),
    xp: s.xp_earned || 0, time: Math.round((s.duration || 0) / 60),
  }));
  const fallbackData = chartData.length > 0 ? chartData : Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-PK', { weekday: 'short' }), xp: 0, time: 0,
  }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Weekly Activity</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fallbackData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" fontSize={12} stroke="currentColor" />
              <YAxis fontSize={12} stroke="currentColor" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="xp" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
