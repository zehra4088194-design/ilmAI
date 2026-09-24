'use client';

// The Competition Portal's hub. Tabs read from three places without merging their data models:
// - "Daily" / "Class vs Class" / "School vs School" -> the new `competitions` table.
// - "Subject Championships" -> the existing boss_quizzes table, unchanged.
// - "Weekly" -> the existing league_memberships table, unchanged (links out to /leaderboard).
// - "History" -> a merge of both, read-only.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Crown, Flag, Flame, History as HistoryIcon, School, Shield, Sparkles, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateInstitutionCompetitionForm } from './CreateInstitutionCompetitionForm';
import { medalFor, type CompetitionStatus, type CompetitionType } from '@/lib/competitions/types';
import { cn } from '@/lib/utils/cn';

type CompetitionCardData = {
  id: string;
  type: CompetitionType;
  title: string;
  description: string;
  status: CompetitionStatus;
  startsAt: string;
  endsAt: string;
  questionCount: number;
  timeLimitSeconds: number;
  xpReward: number;
  coinReward: number;
  myEntry: { completed_at: string | null; score: number | null; rank: number | null } | null;
};

type ChampionshipCardData = {
  id: string;
  title: string;
  subjectName: string;
  status: CompetitionStatus;
  weekStart: string;
  endsAt: string;
  xpReward: number;
  coinReward: number;
  participantCount: number;
};

const STATUS_FILTERS: Array<{ key: CompetitionStatus | 'all'; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

function StatusFilterBar({ value, onChange }: { value: CompetitionStatus | 'all'; onChange: (v: CompetitionStatus | 'all') => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onChange(filter.key)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === filter.key ? 'border-violet-500 bg-violet-500/10 text-violet-500' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function CompetitionCard({ item }: { item: CompetitionCardData }) {
  const completed = Boolean(item.myEntry?.completed_at);
  return (
    <Link
      href={`/competitions/${item.id}`}
      className="border-border hover:border-violet-500/40 block rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.description}</p>
        </div>
        <Badge variant={item.status === 'active' ? 'default' : item.status === 'upcoming' ? 'secondary' : 'outline'} className="shrink-0 capitalize">
          {item.status}
        </Badge>
      </div>
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span>{Math.round(item.timeLimitSeconds / 60)} min · {item.questionCount} Qs</span>
        <span className="text-violet-400">⚡ {item.xpReward} XP</span>
        <span className="text-amber-400">🪙 {item.coinReward}</span>
        {completed && (
          <span className="ml-auto flex items-center gap-1 font-semibold text-emerald-500">
            {medalFor(item.myEntry?.rank) || '✓'} {item.myEntry?.score}%
          </span>
        )}
      </div>
    </Link>
  );
}

function ChampionshipCard({ item }: { item: ChampionshipCardData }) {
  return (
    <Link href={`/competitions/subject/${item.id}`} className="border-border hover:border-violet-500/40 block rounded-xl border p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold">{item.title}</p>
        </div>
        <Badge variant={item.status === 'active' ? 'default' : item.status === 'upcoming' ? 'secondary' : 'outline'} className="shrink-0 capitalize">
          {item.status}
        </Badge>
      </div>
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="text-violet-400">⚡ {item.xpReward} XP</span>
        <span className="text-amber-400">🪙 {item.coinReward}</span>
        <span className="ml-auto">{item.participantCount} played</span>
      </div>
    </Link>
  );
}

export function CompetitionHub({
  competitions,
  championships,
  weekly,
  history,
  canCreate,
  scopeKind,
  formOptions,
}: {
  competitions: CompetitionCardData[];
  championships: ChampionshipCardData[];
  weekly: { tier: string; weeklyXp: number; tierParticipants: number };
  history: Array<{ id: string; title: string; type: string; completedAt: string; score: number | null; rank: number | null; percentile: number | null; medal: string | null }>;
  canCreate: boolean;
  scopeKind: 'school' | 'college' | null;
  formOptions: { subjects: any[]; chaptersBySubject: Record<string, any[]>; sections: any[] };
}) {
  const [dailyFilter, setDailyFilter] = useState<CompetitionStatus | 'all'>('active');
  const [classFilter, setClassFilter] = useState<CompetitionStatus | 'all'>('active');
  const [schoolFilter, setSchoolFilter] = useState<CompetitionStatus | 'all'>('active');

  const daily = useMemo(() => competitions.filter((c) => c.type === 'daily' && (dailyFilter === 'all' || c.status === dailyFilter)), [competitions, dailyFilter]);
  const classVsClass = useMemo(() => competitions.filter((c) => c.type === 'class_vs_class' && (classFilter === 'all' || c.status === classFilter)), [competitions, classFilter]);
  const schoolVsSchool = useMemo(() => competitions.filter((c) => c.type === 'school_vs_school' && (schoolFilter === 'all' || c.status === schoolFilter)), [competitions, schoolFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-amber-400" /> Competition Portal</h1>
        <p className="text-muted-foreground mt-1 text-sm">Daily challenges, class showdowns, subject championships, and the weekly league — all in one place.</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Daily</TabsTrigger>
          <TabsTrigger value="weekly"><Flame className="mr-1.5 h-3.5 w-3.5" />Weekly</TabsTrigger>
          <TabsTrigger value="subject"><Crown className="mr-1.5 h-3.5 w-3.5" />Subject</TabsTrigger>
          <TabsTrigger value="class"><Users className="mr-1.5 h-3.5 w-3.5" />Class vs Class</TabsTrigger>
          <TabsTrigger value="school"><School className="mr-1.5 h-3.5 w-3.5" />School vs School</TabsTrigger>
          <TabsTrigger value="history"><HistoryIcon className="mr-1.5 h-3.5 w-3.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <StatusFilterBar value={dailyFilter} onChange={setDailyFilter} />
          <div className="grid gap-3 sm:grid-cols-2">
            {daily.map((item) => <CompetitionCard key={item.id} item={item} />)}
          </div>
          {!daily.length && <EmptyState icon={CalendarDays} text="No daily challenge in this state right now — check back soon." />}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <div className="border-border rounded-xl border p-5">
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-violet-400" /><p className="text-sm font-semibold capitalize">{weekly.tier} league</p></div>
            <p className="text-muted-foreground mt-1 text-sm">You've earned <span className="text-violet-400 font-bold">{weekly.weeklyXp} XP</span> this week against {weekly.tierParticipants} students in your league.</p>
            <Link href="/leaderboard" className="mt-4 inline-flex h-9 items-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">
              Open weekly leaderboard
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="subject" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {championships.map((item) => <ChampionshipCard key={item.id} item={item} />)}
          </div>
          {!championships.length && <EmptyState icon={Crown} text="No subject championship yet — the weekly generator runs every Monday." />}
        </TabsContent>

        <TabsContent value="class" className="mt-4">
          {canCreate && scopeKind && <CreateInstitutionCompetitionForm competitionType="class_vs_class" formOptions={formOptions} />}
          <StatusFilterBar value={classFilter} onChange={setClassFilter} />
          <div className="grid gap-3 sm:grid-cols-2">
            {classVsClass.map((item) => <CompetitionCard key={item.id} item={item} />)}
          </div>
          {!classVsClass.length && <EmptyState icon={Users} text={scopeKind ? 'No class-vs-class competition in this state.' : 'Join a school or college to unlock class competitions.'} />}
        </TabsContent>

        <TabsContent value="school" className="mt-4">
          {canCreate && scopeKind && <CreateInstitutionCompetitionForm competitionType="school_vs_school" formOptions={formOptions} />}
          <StatusFilterBar value={schoolFilter} onChange={setSchoolFilter} />
          <div className="grid gap-3 sm:grid-cols-2">
            {schoolVsSchool.map((item) => <CompetitionCard key={item.id} item={item} />)}
          </div>
          {!schoolVsSchool.length && <EmptyState icon={School} text={scopeKind ? 'No school-wide competition in this state.' : 'Join a school or college to unlock school competitions.'} />}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {history.map((item) => (
            <div key={item.id} className="border-border flex items-center gap-3 rounded-lg border p-3 text-sm">
              <Flag className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">{new Date(item.completedAt).toLocaleDateString()}</p>
              </div>
              {item.medal && <span>{item.medal}</span>}
              <span className="shrink-0 font-bold text-violet-500">{item.score}%</span>
            </div>
          ))}
          {!history.length && <EmptyState icon={HistoryIcon} text="No completed competitions yet — jump into a daily challenge to start your streak." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Trophy; text: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm">
      <Icon className="h-6 w-6 opacity-50" />
      {text}
    </div>
  );
}
