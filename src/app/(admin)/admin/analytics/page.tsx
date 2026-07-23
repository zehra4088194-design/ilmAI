import { Metadata } from 'next';
import { Activity, BarChart3, BookOpen, Eye, GraduationCap, MessageCircle, MousePointerClick, NotebookTabs, ShieldCheck, Trophy, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin - Analytics' };
export const dynamic = 'force-dynamic';

type ProfileRow = {
  subscription_tier: string | null;
  education_level: string | null;
  role: string | null;
  created_at: string;
  last_active_date: string | null;
  is_profile_complete: boolean | null;
};

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function countBy(rows: ProfileRow[], key: keyof Pick<ProfileRow, 'subscription_tier' | 'education_level' | 'role'>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] || 'unknown').toUpperCase();
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

type PostHogStats = {
  configured: boolean;
  queryReady: boolean;
  error: string | null;
  events24h: number;
  pageviews7d: number;
  visitors7d: number;
  topPages: { path: string; count: number }[];
  topEvents: { event: string; count: number }[];
};

function getPostHogPrivateHost() {
  const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';
  return host
    .replace(/\/$/, '')
    .replace('https://eu.i.posthog.com', 'https://eu.posthog.com')
    .replace('https://us.i.posthog.com', 'https://us.posthog.com');
}

async function posthogQuery<T extends unknown[]>(query: string): Promise<T[]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY || process.env.POSTHOG_QUERY_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) throw new Error('POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are required');

  const response = await fetch(`${getPostHogPrivateHost()}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, name: 'ilm-ai-admin-live-analytics' }),
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.detail || json?.error || `PostHog query failed (${response.status})`);
  return (json.results || []) as T[];
}

async function getPostHogStats(): Promise<PostHogStats> {
  const ingestConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const queryReady = Boolean(
    (process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY || process.env.POSTHOG_QUERY_API_KEY)
    && (process.env.POSTHOG_PROJECT_ID || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID)
  );
  if (!ingestConfigured && !queryReady) {
    return { configured: false, queryReady: false, error: null, events24h: 0, pageviews7d: 0, visitors7d: 0, topPages: [], topEvents: [] };
  }
  if (!queryReady) {
    return {
      configured: ingestConfigured,
      queryReady: false,
      error: 'PostHog events are being sent. Add POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID for live reads.',
      events24h: 0,
      pageviews7d: 0,
      visitors7d: 0,
      topPages: [],
      topEvents: [],
    };
  }

  try {
    const [eventsRows, pageviewRows, topPageRows, topEventRows] = await Promise.all([
      posthogQuery<[number]>("SELECT count() FROM events WHERE timestamp >= now() - interval 1 day"),
      posthogQuery<[number, number]>("SELECT count(), uniq(distinct_id) FROM events WHERE event = '$pageview' AND timestamp >= now() - interval 7 day"),
      posthogQuery<[string | null, number]>("SELECT properties.$pathname AS path, count() FROM events WHERE event = '$pageview' AND timestamp >= now() - interval 7 day GROUP BY path ORDER BY count() DESC LIMIT 8"),
      posthogQuery<[string, number]>("SELECT event, count() FROM events WHERE timestamp >= now() - interval 7 day GROUP BY event ORDER BY count() DESC LIMIT 8"),
    ]);
    return {
      configured: true,
      queryReady: true,
      error: null,
      events24h: Number(eventsRows[0]?.[0] || 0),
      pageviews7d: Number(pageviewRows[0]?.[0] || 0),
      visitors7d: Number(pageviewRows[0]?.[1] || 0),
      topPages: topPageRows.map(([path, count]) => ({ path: path || '/', count: Number(count || 0) })),
      topEvents: topEventRows.map(([event, count]) => ({ event, count: Number(count || 0) })),
    };
  } catch (error) {
    return {
      configured: ingestConfigured,
      queryReady,
      error: error instanceof Error ? error.message : 'PostHog live query failed',
      events24h: 0,
      pageviews7d: 0,
      visitors7d: 0,
      topPages: [],
      topEvents: [],
    };
  }
}

async function safeCount(db: Awaited<ReturnType<typeof createAdminClient>>, table: string, column = 'id') {
  const { count, error } = await (db.from(table as any) as any).select(column, { count: 'exact', head: true });
  if (error) {
    console.warn(`analytics count failed for ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export default async function AdminAnalyticsPage() {
  const db = await createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    profilesRes,
    quizCount,
    notesCount,
    lectureCount,
    libraryCount,
    pastPaperCount,
    chatMessageCount,
    feedbackRes,
    quizScoresRes,
    posthogStats,
  ] = await Promise.all([
    db.from('profiles').select('subscription_tier, education_level, role, created_at, last_active_date, is_profile_complete').limit(10000),
    safeCount(db, 'quiz_sessions'),
    safeCount(db, 'notes'),
    safeCount(db, 'lectures'),
    safeCount(db, 'library_resources'),
    safeCount(db, 'past_papers'),
    safeCount(db, 'student_chat_messages'),
    db.from('ai_answer_feedback').select('is_helpful, created_at').limit(10000),
    db.from('quiz_sessions').select('score, completed_at').not('score', 'is', null).limit(1000),
    getPostHogStats(),
  ]);

  const profiles = (profilesRes.data || []) as ProfileRow[];
  const feedback = feedbackRes.data || [];
  const quizScores = quizScoresRes.data || [];
  const tierCounts = countBy(profiles, 'subscription_tier');
  const educationCounts = countBy(profiles, 'education_level');
  const roleCounts = countBy(profiles, 'role');
  const totalUsers = profiles.length;
  const activeToday = profiles.filter((row) => row.last_active_date === today).length;
  const newThisWeek = profiles.filter((row) => new Date(row.created_at) >= new Date(sevenDaysAgo)).length;
  const completeProfiles = profiles.filter((row) => row.is_profile_complete).length;
  const helpful = feedback.filter((row) => row.is_helpful).length;
  const averageScore = quizScores.length
    ? Math.round(quizScores.reduce((sum, row) => sum + Number(row.score || 0), 0) / quizScores.length)
    : 0;

  const statCards = [
    { label: 'Total Users', value: totalUsers, sub: `${newThisWeek} new last 7 days`, icon: Users, color: 'text-cyan-400' },
    { label: 'Active Today', value: activeToday, sub: `${pct(activeToday, totalUsers)} of users`, icon: Activity, color: 'text-emerald-400' },
    { label: 'Profile Complete', value: completeProfiles, sub: `${pct(completeProfiles, totalUsers)} completed`, icon: ShieldCheck, color: 'text-violet-400' },
    { label: 'Quiz Sessions', value: quizCount, sub: `${averageScore}% avg score`, icon: Trophy, color: 'text-amber-400' },
    { label: 'Study Notes', value: notesCount, sub: 'student-created notes', icon: NotebookTabs, color: 'text-blue-400' },
    { label: 'Library Items', value: libraryCount + pastPaperCount, sub: `${libraryCount} books/notes, ${pastPaperCount} papers`, icon: BookOpen, color: 'text-pink-400' },
    { label: 'Lectures', value: lectureCount, sub: 'admin-added videos', icon: GraduationCap, color: 'text-orange-400' },
    { label: 'Student Chat', value: chatMessageCount, sub: 'messages sent', icon: MessageCircle, color: 'text-green-400' },
    { label: 'AI Feedback', value: feedback.length, sub: feedback.length ? `${pct(helpful, feedback.length)} helpful` : 'no feedback yet', icon: BarChart3, color: 'text-indigo-400' },
  ];
  const internalActivity = [
    { path: '/dashboard', count: activeToday, label: 'Active users today' },
    { path: '/lectures', count: lectureCount, label: 'Lecture library' },
    { path: '/student-chat', count: chatMessageCount, label: 'Student chat messages' },
    { path: '/mcq/session', count: quizCount, label: 'Quiz sessions' },
    { path: '/notes', count: notesCount, label: 'Study notes' },
    { path: '/library', count: libraryCount, label: 'Library resources' },
    { path: '/past-papers', count: pastPaperCount, label: 'Past papers' },
    { path: '/ai-tutor', count: feedback.length, label: 'AI answer feedback' },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live Supabase platform stats plus PostHog product analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-5">
                <Icon className={`mb-3 h-5 w-5 ${item.color}`} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Eye className="mb-3 h-5 w-5 text-cyan-400" />
            <p className="text-xs text-muted-foreground">PostHog Pageviews</p>
            <p className="text-2xl font-bold">{posthogStats.pageviews7d.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Users className="mb-3 h-5 w-5 text-emerald-400" />
            <p className="text-xs text-muted-foreground">PostHog Visitors</p>
            <p className="text-2xl font-bold">{posthogStats.visitors7d.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">unique distinct IDs, 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <MousePointerClick className="mb-3 h-5 w-5 text-violet-400" />
            <p className="text-xs text-muted-foreground">Product Events</p>
            <p className="text-2xl font-bold">{posthogStats.events24h.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(posthogStats.topPages.length ? posthogStats.topPages : internalActivity).map((page) => (
              <div key={page.path} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="truncate text-sm">{'label' in page ? `${page.path} · ${page.label}` : page.path}</span>
                <Badge variant="outline">{page.count.toLocaleString()}</Badge>
              </div>
            ))}
            {!posthogStats.topPages.length && internalActivity.length === 0 && (
              <p className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">{posthogStats.error || 'No activity recorded yet.'}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(posthogStats.topEvents.length ? posthogStats.topEvents : [
              { event: 'new_users_7d', count: newThisWeek },
              { event: 'profile_completed', count: completeProfiles },
              { event: 'quiz_sessions', count: quizCount },
              { event: 'student_chat_messages', count: chatMessageCount },
              { event: 'ai_feedback_votes', count: feedback.length },
            ].filter((event) => event.count > 0)).map((event) => (
              <div key={event.event} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="truncate text-sm">{event.event}</span>
                <Badge variant="outline">{event.count.toLocaleString()}</Badge>
              </div>
            ))}
            {!posthogStats.topEvents.length && !internalActivity.length && (
              <p className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">{posthogStats.error || 'No product events recorded yet.'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Tier Split</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {['FREE', 'PRO', 'ELITE'].map((tier) => (
              <div key={tier} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="font-medium">{tier}</span>
                <Badge variant="secondary">{(tierCounts[tier] || 0).toLocaleString()} users</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Education Levels</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'UNKNOWN'].map((level) => (
              <div key={level} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="font-medium">{level}</span>
                <Badge variant="outline">{(educationCounts[level] || 0).toLocaleString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Account Roles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="font-medium">{role}</span>
                <Badge variant="outline">{count.toLocaleString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Product Analytics</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant={posthogStats.configured ? 'success' : 'warning'}>
            {posthogStats.queryReady ? 'PostHog live query connected' : posthogStats.configured ? 'PostHog capture enabled' : 'PostHog env missing'}
          </Badge>
          <span>{posthogStats.error || 'Cookie-consented pageviews are captured client-side, and the cards above read PostHog live.'}</span>
        </CardContent>
      </Card>
    </div>
  );
}
