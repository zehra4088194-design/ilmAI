'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Sparkles, Copy, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { EssayClassBanner } from '@/components/features/essay-writer/EssayClassBanner';
import { GradeOverrideSelect } from '@/components/features/essay-writer/GradeOverrideSelect';
import type { GradeLevel as ProfileGradeLevel } from '@/lib/supabase/getUserGradeLevel';
import {
  isGradeLevel,
  normalizeEssayGradeLevel,
  type EssayWriterResponseData,
  type GradeLevel,
} from '@/lib/utils/buildGradeContext';
import type { SubscriptionTier } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/auth/useAuth';

const ESSAY_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'argumentative', label: 'Argumentative' },
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'narrative', label: 'Narrative' },
  { value: 'compare-contrast', label: 'Compare/Contrast' },
];

const WORD_COUNTS = [150, 300, 500, 800];

interface EssayWriterFormProps {
  userTier: SubscriptionTier;
  gradeLevel: ProfileGradeLevel | null;
}

export function EssayWriterForm({ userTier, gradeLevel: initialGradeLevel }: EssayWriterFormProps) {
  const profileGradeLevel = normalizeEssayGradeLevel(initialGradeLevel);
  const [topic, setTopic] = useState('');
  const [essayType, setEssayType] = useState('general');
  const [wordCount, setWordCount] = useState(300);
  const [language, setLanguage] = useState<'english' | 'urdu'>('english');
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [aiTier, setAiTier] = useState<ModelTier>('mini');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(profileGradeLevel);
  const [showOverride, setShowOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [essay, setEssay] = useState<string | null>(null);
  const [essayGradeLevel, setEssayGradeLevel] = useState<GradeLevel | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const { user } = useAuth();
  const isFreeTier = userTier === 'FREE';

  async function loadHistory() {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/ai/essay-writer/history');
      const body = await res.json();
      if (body.status !== 'success') return;
      setHistory(body.data.essays);
    } catch {
      // Non-fatal — the writer still works without the saved list loading.
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [user?.id]);

  async function openSaved(id: string) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/ai/essay-writer/history/${id}`);
      const body = await res.json();
      if (body.status !== 'success') throw new Error(body.error || 'This essay could not be opened.');
      setEssay(body.data.essay);
      setEssayGradeLevel(isGradeLevel(body.data.meta?.gradeLevel) ? body.data.meta.gradeLevel : null);
      setActiveHistoryId(id);
    } catch {
      toast.error('This essay could not be opened.');
    } finally {
      setHistoryLoading(false);
    }
  }

  const generate = async () => {
    if (!topic.trim()) { toast.error('Essay topic likho pehle'); return; }
    setLoading(true);
    setEssay(null);
    setEssayGradeLevel(null);
    try {
      const res = await fetch('/api/ai/essay-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, wordCount, essayType, language, provider, aiTier, gradeLevel }),
      });
      const json = await res.json() as
        | { status: 'error'; error: string }
        | { status: 'success'; data: EssayWriterResponseData };
      if (json.status === 'error') { toast.error(json.error); return; }
      setEssay(json.data.essay);
      setEssayGradeLevel(isGradeLevel(json.data.gradeLevel) ? json.data.gradeLevel : gradeLevel);
      setGradeLevel(profileGradeLevel);
      setShowOverride(false);
      setActiveHistoryId(null);
      void loadHistory(); // pick up the row /api/ai/essay-writer just saved
    } catch {
      toast.error('The essay could not be generated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyEssay = () => {
    if (!essay) return;
    navigator.clipboard.writeText(essay);
    toast.success('Copied.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Essay Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. My Best Friend, Importance of Education, Pollution"
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <div className="mt-1">
              <GradeOverrideSelect
                value={gradeLevel}
                profileGradeLevel={profileGradeLevel}
                open={showOverride}
                onOpenChange={setShowOverride}
                onChange={setGradeLevel}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Essay Type</label>
              <select value={essayType} onChange={(e) => setEssayType(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {ESSAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Word Count</label>
              <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {WORD_COUNTS.map((w) => <option key={w} value={w}>{w} words</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as 'english' | 'urdu')} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="english">English</option>
                <option value="urdu">Roman Urdu mix</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <AIProviderSelector provider={provider} tier={aiTier} onChange={(p, t) => { setProvider(p); setAiTier(t); }} isFreeTier={isFreeTier} />
            <Button variant="gradient" size="lg" onClick={generate} disabled={loading}>
              {loading ? <RotateCcw className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
              {loading ? 'Writing...' : 'Write Essay'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-violet-400" />
              Saved Essays
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={historyLoading}
                onClick={() => void openSaved(item.id)}
                className={cn(
                  'flex flex-col rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50',
                  activeHistoryId === item.id
                    ? 'border-violet-400 bg-violet-500/10'
                    : 'border-transparent hover:bg-muted/50'
                )}
              >
                <span className="truncate font-medium">{item.title}</span>
                <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <BrandLoader label="AI is writing your essay..." />
          </motion.div>
        )}

        {essay && !loading && (
          <motion.div key="essay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-400" />Your Essay</p>
              <Button variant="outline" size="sm" onClick={copyEssay}><Copy className="w-3.5 h-3.5" />Copy</Button>
            </div>
            {essayGradeLevel && (
              <EssayClassBanner
                gradeLevel={essayGradeLevel}
                onChangeClick={() => setShowOverride(true)}
              />
            )}
            <AiAnswerRenderer content={essay} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
