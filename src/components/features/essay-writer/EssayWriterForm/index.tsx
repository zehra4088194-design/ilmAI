'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Sparkles, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const isFreeTier = userTier === 'FREE';

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
    } catch {
      toast.error('Essay generate nahi hui, dobara koshish karo');
    } finally {
      setLoading(false);
    }
  };

  const copyEssay = () => {
    if (!essay) return;
    navigator.clipboard.writeText(essay);
    toast.success('Copy ho gaya!');
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
              {loading ? 'Likh raha hai...' : 'Essay Likho'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <BrandLoader label="AI essay likh raha hai..." />
          </motion.div>
        )}

        {essay && !loading && (
          <motion.div key="essay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-400" />Tumhari Essay</p>
              <Button variant="outline" size="sm" onClick={copyEssay}><Copy className="w-3.5 h-3.5" />Copy Karo</Button>
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
