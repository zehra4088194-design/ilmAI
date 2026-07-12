import { Metadata } from 'next';
import { Activity, BarChart3, BookOpen, GraduationCap, MessageCircle, NotebookTabs, ShieldCheck, Trophy, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin - Analytics' };

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

async function safeCount(db: Awaited<ReturnType<typeof createAdminClient>>, table: string, column = 'id') {
  const { count } = await (db.from(table as any) as any).select(column, { count: 'exact', head: true });
  return count ?? 0;
}

export default async function AdminAnalyticsPage() {
  const db = await createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live platform stats from Supabase and product analytics status.</p>
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
          <Badge variant={posthogConfigured ? 'success' : 'warning'}>
            {posthogConfigured ? 'PostHog pageviews enabled' : 'PostHog env missing'}
          </Badge>
          <span>Cookie-consented pageviews are captured client-side. Supabase stats above are live backend counts.</span>
        </CardContent>
      </Card>
    </div>
  );
}
