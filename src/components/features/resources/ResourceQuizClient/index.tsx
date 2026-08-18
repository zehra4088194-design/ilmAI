'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileQuestion, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ProtectedResourceKind } from '@/lib/resources/server';

type StoredMcq = { q?: string; opts?: string[]; correct?: number; exp?: string };

/**
 * Full-page "Chapter MCQs" quick quiz — previously rendered as a small one-question-at-a-time box
 * directly below the open PDF (ResourceMcqSet, still used nowhere else now). Moved to its own page
 * so taking the quiz feels like a real test, not a cramped inline widget.
 */
export function ResourceQuizClient({ kind, resourceId }: { kind: ProtectedResourceKind; resourceId: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<StoredMcq[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/resources/questions?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(resourceId)}`,
          { cache: 'no-store' }
        );
        const json = await response.json();
        if (cancelled) return;
        if (response.status === 202) {
          setStatus('processing');
          return;
        }
        if (!response.ok || json.status === 'error') throw new Error(json.error || 'MCQs could not be loaded.');
        setQuestions(Array.isArray(json.data?.questions) ? json.data.questions : []);
        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          toast.error(error instanceof Error ? error.message : 'MCQs could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, resourceId]);

  const current = questions[index];
  const jumpTo = (nextIndex: number) => {
    setIndex(Math.max(0, Math.min(questions.length - 1, nextIndex)));
    setSelected(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to file
      </Button>

      {loading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading chapter MCQs...</p>
        </div>
      ) : status === 'processing' ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileQuestion className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold">Still preparing these MCQs</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Source-grounded questions are being processed in the background. Check back in a moment.
            </p>
          </CardContent>
        </Card>
      ) : !current ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground text-sm">No MCQs are available for this file yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/25">
          <CardContent className="space-y-5 p-6">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
              <span>
                MCQ {index + 1} / {questions.length}
              </span>
              <span>1 mark</span>
            </div>
            <p className="text-lg leading-7 font-semibold break-words">{current.q || 'Question unavailable'}</p>
            <div className="grid gap-2.5">
              {(current.opts || []).map((option, optionIndex) => {
                const isSelected = selected === optionIndex;
                const isCorrect = current.correct === optionIndex;
                const revealed = selected !== null;
                return (
                  <button
                    key={`${index}-${optionIndex}`}
                    type="button"
                    onClick={() => setSelected(optionIndex)}
                    disabled={revealed}
                    className={`flex min-w-0 items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      revealed && isCorrect
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : revealed && isSelected
                          ? 'border-red-500/60 bg-red-500/10'
                          : 'bg-background/70 hover:border-amber-500/40'
                    }`}
                  >
                    <span className="flex-none font-bold text-amber-600">{String.fromCharCode(65 + optionIndex)}.</span>
                    <span className="min-w-0 break-words">{option}</span>
                  </button>
                );
              })}
            </div>
            {selected !== null && current.exp && (
              <p className="text-muted-foreground rounded-xl bg-amber-500/10 p-3 text-sm leading-6">
                Explanation: {current.exp}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => jumpTo(index - 1)}>
                Previous
              </Button>
              <Button
                variant="gradient"
                size="sm"
                disabled={index >= questions.length - 1}
                onClick={() => jumpTo(index + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
