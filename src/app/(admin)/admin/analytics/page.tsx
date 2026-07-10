import { Metadata } from 'next';
import { BarChart3, LineChart, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Admin - Analytics' };

export default function AdminAnalyticsPage() {
  const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform stats aur future product analytics ka setup.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><BarChart3 className="mb-3 h-5 w-5 text-violet-400" /><p className="text-xs text-muted-foreground">Basic Stats</p><p className="text-2xl font-bold">Overview</p></CardContent></Card>
        <Card><CardContent className="p-5"><MousePointerClick className="mb-3 h-5 w-5 text-blue-400" /><p className="text-xs text-muted-foreground">Product Events</p><p className="text-2xl font-bold">{posthogConfigured ? 'Ready' : 'Optional'}</p></CardContent></Card>
        <Card><CardContent className="p-5"><LineChart className="mb-3 h-5 w-5 text-green-400" /><p className="text-xs text-muted-foreground">Retention Funnels</p><p className="text-2xl font-bold">Future</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>PostHog ka kya karna hai?</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Badge variant={posthogConfigured ? 'success' : 'secondary'}>{posthogConfigured ? 'PostHog env configured' : 'PostHog not required yet'}</Badge>
          <p>
            PostHog optional product analytics ke liye hota hai: student kis feature par click karta hai, onboarding funnel kahan drop hota hai,
            subscription conversion, retention, DAU/WAU, etc. App chalane ke liye PostHog zaroori nahi.
          </p>
          <p>
            Jab analytics events implement karne hon, env mein <code className="rounded bg-muted px-1">NEXT_PUBLIC_POSTHOG_KEY</code> aur
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_POSTHOG_HOST</code> add karna hoga. Abhi basic admin overview app ke DB se enough hai.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
