'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  FileQuestion,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import type { SubscriptionTier } from '@/types';
import type { GuessPaperResult } from '@/app/api/ai/guess-paper/route';
import { toast } from 'sonner';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';

export function GuessPaperClient({
  subjects,
  userTier,
  defaultBoard,
  defaultGrade,
}: {
  subjects: { id: string; name: string; color: string }[];
  userTier: SubscriptionTier;
  defaultBoard?: string;
  defaultGrade?: string;
}) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [board, setBoard] = useState(defaultBoard || 'FBISE');
  const [gradeLevel, setGradeLevel] = useState(defaultGrade || 'GRADE_10');
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [aiTier, setAiTier] = useState<ModelTier>('mini');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuessPaperResult | null>(null);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const isFreeTier = userTier === 'FREE';

  const generate = async () => {
    if (!selectedSubject) {
      toast.error('Subject select karo');
      return;
    }
    setLoading(true);
    setResult(null);
    setSummary('');
    try {
      const res = await fetch('/api/ai/guess-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubject, board, gradeLevel, provider, aiTier }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data);
    } catch {
      toast.error('Kuch ghalat ho gaya. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!result || summaryLoading) return;
    if (summary) {
      setSummary('');
      return;
    }
    setSummaryLoading(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: JSON.stringify(result, null, 2) }),
      });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'Summary generate nahi hui.');
      setSummary(json.data.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Summary generate nahi hui.');
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                Board
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                disabled
                className="border-input bg-muted/40 text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                {BOARDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                disabled
                className="border-input bg-muted/40 text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AIProviderSelector
              provider={provider}
              tier={aiTier}
              onChange={(p, t) => {
                setProvider(p);
                setAiTier(t);
              }}
              isFreeTier={isFreeTier}
            />
            <Button variant="gradient" onClick={generate} loading={loading} size="lg">
              <Sparkles className="h-4 w-4" />
              Generate Guess Paper
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <BrandLoader label="AI predict kar raha hai..." />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Disclaimer */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-500">
            ⚠️ {result.disclaimer}
          </div>

          {/* Hot Topics */}
          {result.hotTopics?.length > 0 && (
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-violet-400" />
                  Hot Topics 🔥
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.hotTopics.map((t, i) => (
                  <Badge key={i} variant="outline" className="border-violet-500/30 text-violet-300">
                    {t}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* MCQs */}
          <GuessPaperSection
            title="Likely MCQs"
            icon={<FileQuestion className="h-4 w-4 text-blue-400" />}
            count={result.mcqs?.length}
          >
            {result.mcqs?.map((q, i) => (
              <div key={i} className="bg-muted/30 border-border/50 rounded-xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <LikelihoodBadge level={q.likelihood} />
                  <span className="text-muted-foreground text-xs">MCQ {i + 1}</span>
                </div>
                <p className="mb-2 text-sm font-medium">{q.q}</p>
                {q.opts?.length > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {q.opts.map((opt, oi) => (
                      <div key={oi} className="text-muted-foreground flex items-center gap-1 text-xs">
                        <span className="font-bold">{['A', 'B', 'C', 'D'][oi]}.</span> {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </GuessPaperSection>

          {/* Short Questions */}
          <GuessPaperSection
            title="Likely Short Questions"
            icon={<BookOpen className="h-4 w-4 text-green-400" />}
            count={result.shortQuestions?.length}
          >
            {result.shortQuestions?.map((q, i) => (
              <div key={i} className="bg-muted/30 border-border/50 flex items-start gap-3 rounded-xl border p-3">
                <LikelihoodBadge level={q.likelihood} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{q.q}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{q.marks} marks</p>
                </div>
              </div>
            ))}
          </GuessPaperSection>

          {/* Long Questions */}
          <GuessPaperSection
            title="Likely Long Questions"
            icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
            count={result.longQuestions?.length}
          >
            {result.longQuestions?.map((q, i) => (
              <div key={i} className="bg-muted/30 border-border/50 flex items-start gap-3 rounded-xl border p-3">
                <LikelihoodBadge level={q.likelihood} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.q}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{q.marks} marks</p>
                </div>
              </div>
            ))}
          </GuessPaperSection>

          {/* Exam Tips */}
          {result.examTips?.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  Exam Strategy Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.examTips.map((tip, i) => (
                  <div key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                    <span className="shrink-0 text-green-400">{i + 1}.</span>
                    {tip}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">AI Revision Summary</p>
                  <p className="text-muted-foreground text-xs">
                    Guess paper ke important topics aur exam strategy points mein.
                  </p>
                </div>
                {isFreeTier ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/subscription">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Unlock with Pro
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={generateSummary} disabled={summaryLoading}>
                    {summaryLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {summary ? 'Hide Summary' : 'AI Summary'}
                  </Button>
                )}
              </div>
              {summary && <AiAnswerRenderer content={summary} label="AI Guess Paper Summary" />}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" onClick={generate} loading={loading}>
            <Sparkles className="h-4 w-4" />
            Dobara Generate Karo
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function LikelihoodBadge({ level }: { level: 'high' | 'medium' }) {
  return (
    <Badge variant={level === 'high' ? 'success' : 'warning'} className="shrink-0 text-xs">
      {level === 'high' ? '🔥 High' : '⭐ Medium'}
    </Badge>
  );
}

function GuessPaperSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!count) return null;
  return (
    <Card>
      <CardHeader className="cursor-pointer pb-3" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title} <span className="text-muted-foreground text-xs font-normal">({count})</span>
          </CardTitle>
          {collapsed ? (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </CardHeader>
      {!collapsed && <CardContent className="space-y-3">{children}</CardContent>}
    </Card>
  );
}
