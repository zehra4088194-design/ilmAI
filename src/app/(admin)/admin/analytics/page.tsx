import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export const metadata: Metadata = { title: 'Admin - Analytics' };
export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <Card><CardHeader><CardTitle>Platform Growth</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Detailed analytics charts (DAU, retention, conversion funnel) connect ho sakte hain PostHog ya Mixpanel se. Currently basic stats Overview page par hain.</p></CardContent>
      </Card>
    </div>
  );
}
