import { Metadata } from 'next';
import { BarChart3, GraduationCap, LineChart, MousePointerClick, ShieldCheck, Users } from 'lucide-react';
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
        <Card><CardContent className="p-5"><Users className="mb-3 h-5 w-5 text-cyan-400" /><p className="text-xs text-muted-foreground">Tier Split</p><p className="text-2xl font-bold">Free / Pro / Elite</p></CardContent></Card>
        <Card><CardContent className="p-5"><GraduationCap className="mb-3 h-5 w-5 text-amber-400" /><p className="text-xs text-muted-foreground">Adoption</p><p className="text-2xl font-bold">School / University</p></CardContent></Card>
        <Card><CardContent className="p-5"><ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" /><p className="text-xs text-muted-foreground">Feature Detect</p><p className="text-2xl font-bold">Defensive</p></CardContent></Card>
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

      <Card>
        <CardHeader><CardTitle>Unified analytics sections</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p><strong className="text-foreground">Student:</strong> XP, streak, study trend, subject/activity distribution at <code className="rounded bg-muted px-1">/dashboard/analytics</code>.</p>
          <p><strong className="text-foreground">Teacher:</strong> class score distribution and weak-area placeholders at <code className="rounded bg-muted px-1">/teacher/classes/[id]/analytics</code>.</p>
          <p><strong className="text-foreground">Parent:</strong> linked child trend and anonymized comparison at <code className="rounded bg-muted px-1">/parent/analytics</code>.</p>
          <p><strong className="text-foreground">Admin:</strong> PostHog readiness, tier split, university adoption, and graceful missing-table handling here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
