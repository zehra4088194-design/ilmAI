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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [counts, setCounts] = useState({ mcq: 0, short: 0, long: 0 });

  const generateSummary = async () => {
    if (summary) {
      setSummary(null);
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
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'Summary generate nahi hui.');
      setSummary(json.data.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Summary generate nahi hui.');
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
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'File analyze nahi hui.');
      setAnalysis(json.data);
      setCounts({
        mcq: Math.min(10, json.data.available.mcq),
        short: Math.min(5, json.data.available.short),
        long: Math.min(2, json.data.available.long),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'File analyze nahi hui.');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateTest = async () => {
    if (counts.mcq + counts.short + counts.long === 0) {
      toast.error('Kam az kam ek question select karo.');
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
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'Test generate nahi hua.');
      window.sessionStorage.setItem('ilm-ai-resource-test', JSON.stringify(json.data));
      router.push('/full-test?source=resource');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test generate nahi hua.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isPaid) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
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
      {summary && <AiAnswerRenderer content={summary} label="Gemini AI Summary" />}
      {analysis && (
        <div className="border-primary/25 bg-primary/5 rounded-xl border p-3">
          <div className="mb-3 flex items-start gap-2">
            <BrainCircuit className="text-primary mt-0.5 h-4 w-4" />
            <div>
              <p className="text-sm font-semibold">Grok file analysis</p>
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
            Gemini se test banao
          </Button>
        </div>
      )}
    </div>
  );
}
