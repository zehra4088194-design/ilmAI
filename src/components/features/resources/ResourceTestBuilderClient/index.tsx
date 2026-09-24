'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { ProtectedResourceKind } from '@/lib/resources/server';

type Analysis = {
  documentType: string;
  topics: string[];
  detectedSections: string[];
  available: { mcq: number; short: number; long: number };
};

/**
 * Full-page "Test from this file" builder — previously the analysis + count-picker step appeared
 * as a small inline box directly below the open PDF (ResourceAiTools). Moved to its own page so
 * the whole flow (analyze -> pick counts -> generate) reads as one real page, not a cramped
 * widget; Generate Test still hands off to /full-test exactly as before.
 */
export function ResourceTestBuilderClient({ kind, resourceId }: { kind: ProtectedResourceKind; resourceId: string }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLabel, setAnalysisLabel] = useState('Content analysis');
  const [analyzing, setAnalyzing] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [counts, setCounts] = useState({ mcq: 0, short: 0, long: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/ai/resource-test/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id: resourceId }),
        });
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || json.status === 'error') throw new Error(json.error || 'The file could not be analyzed.');
        setAnalysis(json.data);
        setAnalysisLabel(json.fallbackUsed ? 'Source-grounded analysis' : 'Content analysis');
        if (json.fallbackUsed) toast.info('The content analysis was completed using the available source material.');
        setCounts({
          mcq: Math.min(30, json.data.available.mcq),
          short: Math.min(5, json.data.available.short),
          long: Math.min(2, json.data.available.long),
        });
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'The file could not be analyzed.');
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, resourceId]);

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
      if (json.data.fallbackUsed) toast.info('Your test was completed using the available source content.');
      router.push('/full-test?source=resource');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The test could not be generated.');
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to file
      </Button>

      {analyzing ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Analyzing this file for a test...</p>
        </div>
      ) : !analysis ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground text-sm">This file could not be analyzed for a test.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/25">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <BrainCircuit className="text-primary mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">{analysisLabel}</p>
                <p className="text-muted-foreground text-sm">
                  {analysis.documentType} | {analysis.topics.slice(0, 4).join(', ') || 'General content'}
                </p>
              </div>
            </div>

            {(() => {
              const availableTypes = (['mcq', 'short', 'long'] as const).filter((type) => analysis.available[type] > 0);
              if (availableTypes.length === 0) {
                return (
                  <p className="text-muted-foreground text-sm">
                    This file doesn&apos;t have enough content to build a test from.
                  </p>
                );
              }
              const typeLabel = { mcq: 'MCQs', short: 'short questions', long: 'long questions' } as const;
              const gridColsClass =
                availableTypes.length === 3 ? 'sm:grid-cols-3' : availableTypes.length === 2 ? 'sm:grid-cols-2' : '';
              return (
                <div className={cn('grid grid-cols-1 gap-3', gridColsClass)}>
                  {availableTypes.map((type) => (
                    <label key={type} className="border-border bg-background/70 rounded-xl border p-3 text-sm">
                      <span className="text-muted-foreground mb-1.5 block">
                        {availableTypes.length === 1
                          ? `How many ${typeLabel[type]}? (up to ${analysis.available[type]})`
                          : `${typeLabel[type]} (max ${analysis.available[type]})`}
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
                        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-base font-semibold"
                      />
                    </label>
                  ))}
                </div>
              );
            })()}

            <Button className="w-full" variant="gradient" size="lg" onClick={generateTest} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
