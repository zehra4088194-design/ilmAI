'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrainCircuit, FileQuestion, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { useAuth } from '@/hooks/auth/useAuth';
import type { ProtectedResourceKind } from '@/lib/resources/server';
import { toast } from 'sonner';

type StoredMcq = { q?: string; opts?: string[]; correct?: number; exp?: string };
type SourceEvidence = { title: string; excerpt: string; confidence: number; pageReference: string };

type Analysis = {
  documentType: string;
  topics: string[];
  detectedSections: string[];
  available: { mcq: number; short: number; long: number };
};

export function ResourceAiTools({ kind, resourceId }: { kind: ProtectedResourceKind; resourceId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const isPaid = user?.subscriptionTier === 'PRO' || user?.subscriptionTier === 'ELITE';
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLabel, setSummaryLabel] = useState('AI Summary');
  const [summarySource, setSummarySource] = useState<SourceEvidence | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLabel, setAnalysisLabel] = useState('Grok file analysis');
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [counts, setCounts] = useState({ mcq: 0, short: 0, long: 0 });

  const generateSummary = async () => {
    if (summary) {
      setSummary(null);
      setSummarySource(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const response = await fetch('/api/ai/resource-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id: resourceId }),
      });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'The summary could not be generated.');
      setSummary(json.data.summary);
      setSummarySource(json.data.source || null);
      setSummaryLabel(
        json.data.fallbackUsed ? 'Source Summary' : `${String(json.data.provider || 'AI').toUpperCase()} Summary`
      );
      if (json.data.fallbackUsed) toast.info('The AI gateway was unavailable; the summary was created from the uploaded TXT source.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The summary could not be generated.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const analyzeForTest = async () => {
    if (analysis) {
      setAnalysis(null);
      return;
    }
    setAnalyzing(true);
    try {
      const response = await fetch('/api/ai/resource-test/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id: resourceId }),
      });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'The file could not be analyzed.');
      setAnalysis(json.data);
      setAnalysisLabel(json.fallbackUsed ? 'Source file analysis' : `${String(json.provider || 'Grok')} file analysis`);
      if (json.fallbackUsed) toast.info('AI gateway unavailable tha; uploaded TXT locally analyze hui.');
      setCounts({
        mcq: Math.min(30, json.data.available.mcq),
        short: Math.min(5, json.data.available.short),
        long: Math.min(2, json.data.available.long),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The file could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateTest = async () => {
    if (counts.mcq + counts.short + counts.long === 0) {
      toast.error('Select at least one question.');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/ai/resource-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id: resourceId, counts }),
      });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'The test could not be generated.');
      window.sessionStorage.setItem('ilm-ai-resource-test', JSON.stringify(json.data));
      if (json.data.fallbackUsed) toast.info('The AI gateway was unavailable; a source-grounded fallback test was created.');
      router.push('/full-test?source=resource');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The test could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isPaid) {
    return (
      <div className="space-y-3">
        <ResourceMcqSet kind={kind} resourceId={resourceId} />
        <div className="grid gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/subscription">
            <Sparkles className="h-3.5 w-3.5" />
            AI Summary <Badge className="ml-1 text-[10px]">Pro</Badge>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/subscription">
            <FileQuestion className="h-3.5 w-3.5" />
            Test from this file <Badge className="ml-1 text-[10px]">Pro</Badge>
          </Link>
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResourceMcqSet kind={kind} resourceId={resourceId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" size="sm" onClick={generateSummary} disabled={summaryLoading}>
          {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {summary ? 'Hide summary' : 'AI Summary'}
        </Button>
        <Button variant="outline" size="sm" onClick={analyzeForTest} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileQuestion className="h-3.5 w-3.5" />}
          {analysis ? 'Close test builder' : 'Test from this file'}
        </Button>
      </div>
      {summary && <AiAnswerRenderer content={summary} label={summaryLabel} />}
      {summary && summarySource && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Verified against: {summarySource.title}</p>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">{summarySource.confidence}% source confidence</span>
          </div>
          <p className="text-muted-foreground mt-2 leading-5">“{summarySource.excerpt}”</p>
          <p className="text-muted-foreground mt-2">Reference: {summarySource.pageReference}. Exact page numbers appear when the uploaded context contains page markers.</p>
        </div>
      )}
      {analysis && (
        <div className="border-primary/25 bg-primary/5 rounded-xl border p-3">
          <div className="mb-3 flex items-start gap-2">
            <BrainCircuit className="text-primary mt-0.5 h-4 w-4" />
            <div>
              <p className="text-sm font-semibold">{analysisLabel}</p>
              <p className="text-muted-foreground text-xs">
                {analysis.documentType} | {analysis.topics.slice(0, 4).join(', ') || 'General content'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['mcq', 'short', 'long'] as const).map((type) => (
              <label key={type} className="border-border bg-background/70 rounded-lg border p-2 text-xs capitalize">
                <span className="text-muted-foreground mb-1 block">
                  {type} (max {analysis.available[type]})
                </span>
                <input
                  type="number"
                  min={0}
                  max={analysis.available[type]}
                  value={counts[type]}
                  onChange={(event) =>
                    setCounts((current) => ({
                      ...current,
                      [type]: Math.max(0, Math.min(analysis.available[type], Number(event.target.value) || 0)),
                    }))
                  }
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm font-semibold"
                />
              </label>
            ))}
          </div>
          <Button className="mt-3 w-full" variant="gradient" size="sm" onClick={generateTest} disabled={generating}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate a test with Gemini
          </Button>
        </div>
      )}
    </div>
  );
}

function ResourceMcqSet({ kind, resourceId }: { kind: ProtectedResourceKind; resourceId: string }) {
  const [questions, setQuestions] = useState<StoredMcq[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');

  const loadQuestions = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/resources/questions?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(resourceId)}`, { cache: 'no-store' });
      const json = await response.json();
      if (response.status === 202) {
        setStatus('processing');
        toast.info('Chapter MCQs are being processed in the background. Refresh in a moment.');
        return;
      }
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'MCQs could not be loaded.');
      setQuestions(Array.isArray(json.data?.questions) ? json.data.questions : []);
      setIndex(0);
      setStatus('ready');
      setOpen(true);
    } catch (error) {
      setStatus('error');
      toast.error(error instanceof Error ? error.message : 'MCQs could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const current = questions[index];
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => void loadQuestions()} disabled={loading}>
        <span className="flex items-center gap-2"><FileQuestion className="h-3.5 w-3.5 text-amber-500" />Chapter ke 30 MCQs</span>
        <span className="text-xs text-muted-foreground">{loading ? 'Loading...' : open ? 'Hide' : 'Open'}</span>
      </Button>
      {status === 'processing' && <p className="mt-2 text-xs text-muted-foreground">Source-grounded MCQs will appear here when OCR and context processing is complete.</p>}
      {open && current && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>MCQ {index + 1} / {questions.length}</span>
            <span>1 mark</span>
          </div>
          <p className="text-sm font-semibold leading-6">{current.q || 'Question unavailable'}</p>
          <div className="grid gap-2">
            {(current.opts || []).map((option, optionIndex) => (
              <div key={`${index}-${optionIndex}`} className="rounded-lg border bg-background/70 px-3 py-2 text-sm">
                <span className="mr-2 font-bold text-amber-600">{String.fromCharCode(65 + optionIndex)}.</span>{option}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={index >= questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>Next</Button>
          </div>
          {current.exp && <p className="rounded-lg bg-amber-500/10 p-2 text-xs leading-5 text-muted-foreground">Explanation: {current.exp}</p>}
        </div>
      )}
    </div>
  );
}
