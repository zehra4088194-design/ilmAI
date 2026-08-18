'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileQuestion, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { useAuth } from '@/hooks/auth/useAuth';
import type { ProtectedResourceKind } from '@/lib/resources/server';
import { toast } from 'sonner';

type SourceEvidence = { title: string; excerpt: string; confidence: number; pageReference: string };

export function ResourceAiTools({ kind, resourceId }: { kind: ProtectedResourceKind; resourceId: string }) {
  const { user } = useAuth();
  const isPaid = user?.subscriptionTier === 'PRO' || user?.subscriptionTier === 'ELITE';
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLabel, setSummaryLabel] = useState('AI Summary');
  const [summarySource, setSummarySource] = useState<SourceEvidence | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

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
      setSummaryLabel(json.data.fallbackUsed ? 'Source-grounded Summary' : 'AI Summary');
      if (json.data.fallbackUsed) toast.info('Your summary was completed using the available source content.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The summary could not be generated.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Both the quick "Chapter MCQs" browser and the full "Test from this file" builder used to
  // render as small inline boxes directly below the open PDF — moved to their own full pages
  // (linked below) so taking/building a test feels like a real page, not a cramped widget.
  const quizHref = `/resource-quiz/${kind}/${resourceId}`;
  const testBuilderHref = `/resource-test-builder/${kind}/${resourceId}`;

  if (!isPaid) {
    return (
      <div className="space-y-3">
        <Button asChild variant="outline" size="sm" className="w-full justify-between">
          <Link href={quizHref}>
            <span className="flex items-center gap-2">
              <FileQuestion className="h-3.5 w-3.5 text-amber-500" />
              30 Chapter MCQs
            </span>
          </Link>
        </Button>
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
      <Button asChild variant="outline" size="sm" className="w-full justify-between">
        <Link href={quizHref}>
          <span className="flex items-center gap-2">
            <FileQuestion className="h-3.5 w-3.5 text-amber-500" />
            30 Chapter MCQs
          </span>
        </Link>
      </Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" size="sm" onClick={generateSummary} disabled={summaryLoading}>
          {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {summary ? 'Hide summary' : 'AI Summary'}
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={testBuilderHref}>
            <FileQuestion className="h-3.5 w-3.5" />
            Test from this file
          </Link>
        </Button>
      </div>
      {summary && <AiAnswerRenderer content={summary} label={summaryLabel} />}
      {summary && summarySource && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Verified against: {summarySource.title}
            </p>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
              {summarySource.confidence}% source confidence
            </span>
          </div>
          <p className="text-muted-foreground mt-2 leading-5">&quot;{summarySource.excerpt}&quot;</p>
          <p className="text-muted-foreground mt-2">
            Reference: {summarySource.pageReference}. If no page marker exists in the uploaded text, ilm AI will not
            invent an exact page number.
          </p>
        </div>
      )}
    </div>
  );
}

