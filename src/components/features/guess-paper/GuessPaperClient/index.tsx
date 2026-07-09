'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, FileQuestion, BookOpen, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import type { SubscriptionTier } from '@/types';
import type { GuessPaperResult } from '@/app/api/ai/guess-paper/route';
import { toast } from 'sonner';

export function GuessPaperClient({
  subjects, userTier, defaultBoard,
}: { subjects: { id: string; name: string; color: string }[]; userTier: SubscriptionTier; defaultBoard?: string }) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [board, setBoard] = useState(defaultBoard || 'FBISE');
  const [gradeLevel, setGradeLevel] = useState('GRADE_10');
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [aiTier, setAiTier] = useState<ModelTier>('mini');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuessPaperResult | null>(null);
  const isFreeTier = userTier === 'FREE';

  const generate = async () => {
    if (!selectedSubject) { toast.error('Subject select karo'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/ai/guess-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubject, board, gradeLevel, provider, aiTier }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setResult(json.data);
    } catch { toast.error('Kuch ghalat ho gaya. Dobara try karo.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Board</label>
              <select value={board} onChange={e => setBoard(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {BOARDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Grade Level</label>
              {/* TODO(module-1): read grade from getUserGradeLevel instead */}
              <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {GRADE_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <AIProviderSelector provider={provider} tier={aiTier} onChange={(p, t) => { setProvider(p); setAiTier(t); }} isFreeTier={isFreeTier} />
            <Button variant="gradient" onClick={generate} loading={loading} size="lg">
              <Sparkles className="w-4 h-4" />Generate Guess Paper
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">AI predict kar raha hai...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Disclaimer */}
          <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
            ⚠️ {result.disclaimer}
          </div>

          {/* Hot Topics */}
          {result.hotTopics?.length > 0 && (
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-violet-400" />Hot Topics 🔥</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.hotTopics.map((t, i) => <Badge key={i} variant="outline" className="border-violet-500/30 text-violet-300">{t}</Badge>)}
              </CardContent>
            </Card>
          )}

          {/* MCQs */}
          <GuessPaperSection title="Likely MCQs" icon={<FileQuestion className="w-4 h-4 text-blue-400" />} count={result.mcqs?.length}>
            {result.mcqs?.map((q, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <LikelihoodBadge level={q.likelihood} />
                  <span className="text-xs text-muted-foreground">MCQ {i + 1}</span>
                </div>
                <p className="text-sm font-medium mb-2">{q.q}</p>
                {q.opts?.length > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {q.opts.map((opt, oi) => (
                      <div key={oi} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="font-bold">{['A', 'B', 'C', 'D'][oi]}.</span> {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </GuessPaperSection>

          {/* Short Questions */}
          <GuessPaperSection title="Likely Short Questions" icon={<BookOpen className="w-4 h-4 text-green-400" />} count={result.shortQuestions?.length}>
            {result.shortQuestions?.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-3">
                <LikelihoodBadge level={q.likelihood} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.q}</p>
                  <p className="text-xs text-muted-foreground mt-1">{q.marks} marks</p>
                </div>
              </div>
            ))}
          </GuessPaperSection>

          {/* Long Questions */}
          <GuessPaperSection title="Likely Long Questions" icon={<TrendingUp className="w-4 h-4 text-amber-400" />} count={result.longQuestions?.length}>
            {result.longQuestions?.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-3">
                <LikelihoodBadge level={q.likelihood} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.q}</p>
                  <p className="text-xs text-muted-foreground mt-1">{q.marks} marks</p>
                </div>
              </div>
            ))}
          </GuessPaperSection>

          {/* Exam Tips */}
          {result.examTips?.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-green-400" />Exam Strategy Tips</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.examTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-green-400 shrink-0">{i + 1}.</span>{tip}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={generate} loading={loading}>
            <Sparkles className="w-4 h-4" />Dobara Generate Karo
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

function GuessPaperSection({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!count) return null;
  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">{icon}{title} <span className="text-xs font-normal text-muted-foreground">({count})</span></CardTitle>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {!collapsed && <CardContent className="space-y-3">{children}</CardContent>}
    </Card>
  );
}
