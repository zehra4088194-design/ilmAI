'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, LockKeyhole, Play, RotateCcw, Sparkles, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QuizTimer } from '@/components/features/quiz/QuizTimer';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { cn } from '@/lib/utils/cn';
import type { DemoQuestionForClient, DemoQuestionResult } from '@/lib/demo/questions';
import { toast } from 'sonner';

type DemoSubject = { id: string; name: string; slug?: string; color?: string | null; count: number };
type DemoResult = {
  score: number;
  correct_count: number;
  total_count: number;
  feedback: string;
  breakdown: DemoQuestionResult[];
};

export function DemoTestClient() {
  const [subjects, setSubjects] = useState<DemoSubject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [questions, setQuestions] = useState<DemoQuestionForClient[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId) || subjects[0], [subjectId, subjects]);
  const currentQuestion = questions[currentIndex];
  const answeredCurrent = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    fetch('/api/demo/subjects')
      .then((res) => res.json())
      .then((json) => {
        const nextSubjects = json.subjects || [];
        setSubjects(nextSubjects);
        setSubjectId(nextSubjects[0]?.id || '');
      })
      .catch(() => toast.error('Demo subjects could not be loaded.'))
      .finally(() => setLoadingSubjects(false));
  }, []);

  const submitDemo = useCallback(async (finalAnswers: Record<string, string>) => {
    if (submitting || result || questions.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/demo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.error || 'The demo could not be submitted.');
      setResult(json.result);
      try { localStorage.setItem('ilm-ai-demo-completed', '1'); } catch {}
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The demo could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }, [questions.length, result, submitting]);

  const startDemo = async () => {
    setStarting(true);
    setLimitMessage('');
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    try {
      const res = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: selectedSubject?.id }),
      });
      const json = await res.json();
      if (json.status === 'limited') {
        setLimitMessage(json.error);
        setQuestions([]);
        return;
      }
      if (!res.ok || json.status === 'error') throw new Error(json.error || 'The demo could not be started.');
      setQuestions(json.questions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The demo could not be started.');
    } finally {
      setStarting(false);
    }
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    if (answers[questionId]) return;
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);
    const isLast = currentIndex === questions.length - 1;
    window.setTimeout(() => {
      if (isLast) submitDemo(nextAnswers);
      else setCurrentIndex((index) => index + 1);
    }, 650);
  };

  const handleExpire = () => {
    if (!currentQuestion || answers[currentQuestion.id]) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: '' };
    setAnswers(nextAnswers);
    if (currentIndex === questions.length - 1) submitDemo(nextAnswers);
    else setCurrentIndex((index) => index + 1);
  };

  if (loadingSubjects) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <section className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-indigo-500/10 p-6 md:p-8">
        <Badge className="mb-4 bg-violet-600">No signup needed</Badge>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Try a Free Demo Test</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Five real MCQs, 10 seconds each, a real score, and AI-assisted feedback. Sign up afterward to save your progress.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/register"><Sparkles className="h-4 w-4" />Sign up free</Link>
          </Button>
        </div>
      </section>

      {limitMessage ? (
        <Card className="border-amber-500/40">
          <CardContent className="p-6 text-center">
            <LockKeyhole className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <h2 className="text-xl font-bold">Free demos used for today</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{limitMessage}</p>
            <Button asChild variant="gradient" className="mt-5">
              <Link href="/register">Sign up free for unlimited practice <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : questions.length === 0 && !result ? (
        <Card>
          <CardContent className="space-y-5 p-6">
            {subjects.length === 0 ? (
              <div className="text-center">
                <p className="text-lg font-semibold">Demo questions are not available yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Admin ko pehle questions par Demo toggle enable karna hoga.</p>
                <Button asChild variant="gradient" className="mt-5"><Link href="/register">Sign up free</Link></Button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold">Choose a subject</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Only subjects with at least five curated demo MCQs are shown.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => setSubjectId(subject.id)}
                      className={cn('rounded-xl border p-4 text-left transition-colors', subjectId === subject.id ? 'border-violet-500 bg-violet-500/10' : 'hover:border-violet-500/40')}
                    >
                      <p className="font-semibold">{subject.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{subject.count} curated MCQs</p>
                    </button>
                  ))}
                </div>
                <Button variant="gradient" size="lg" onClick={startDemo} loading={starting}>
                  <Play className="h-4 w-4" />Start 5-question demo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : result ? (
        <DemoResultView result={result} onRetry={startDemo} />
      ) : currentQuestion ? (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Question {currentIndex + 1} of {questions.length}</span>
              <QuizTimer duration={10} isPaused={answeredCurrent} onExpire={handleExpire} resetKey={currentQuestion.id} />
            </div>
            <Progress value={progress} />
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="warning">{currentQuestion.difficulty}</Badge>
                <Badge variant="outline">{selectedSubject?.name || 'Demo'}</Badge>
              </div>
              <h2 className="mb-6 text-lg font-semibold leading-relaxed">{currentQuestion.text}</h2>
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectAnswer(currentQuestion.id, option.id)}
                      disabled={answeredCurrent}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all',
                        selected ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/50 hover:bg-muted/30',
                        answeredCurrent && !selected && 'opacity-50'
                      )}
                    >
                      <span className="text-sm">{option.text}</span>
                      {selected && <Check className="h-5 w-5 text-violet-400" />}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {submitting && <p className="text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Checking your score...</p>}
        </div>
      ) : null}
    </div>
  );
}

function DemoResultView({ result, onRetry }: { result: DemoResult; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="border-violet-500/35">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[220px,1fr] md:items-center">
          <div className="rounded-2xl bg-violet-500/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">Your score</p>
            <p className="mt-2 text-5xl font-bold text-violet-400">{result.score}%</p>
            <p className="mt-2 text-sm font-medium">{result.correct_count}/{result.total_count} correct</p>
          </div>
          <div>
            <Badge className="mb-3 bg-violet-600">AI feedback</Badge>
            <p className="text-lg font-semibold leading-8">{result.feedback}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link href="/register">Loved it? Sign up free <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" onClick={onRetry}><RotateCcw className="h-4 w-4" />Try another demo</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30 bg-emerald-500/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-bold">Unlock full practice</p>
              <p className="mt-1 text-sm text-muted-foreground">Sign up free to unlock unlimited practice, AI Tutor, progress tracking, notes, past papers, and personalized study plans.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {result.breakdown.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant={question.isCorrect ? 'success' : 'destructive'}>
                  {question.isCorrect ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                  Q{index + 1}
                </Badge>
                <Badge variant="outline">Correct: {question.correctAnswer}</Badge>
              </div>
              <p className="font-medium">{question.text}</p>
              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const isCorrect = option.id === question.correctAnswer;
                  const isSelected = option.id === question.userAnswer;
                  return (
                    <div key={option.id} className={cn('rounded-xl border p-3 text-sm', isCorrect && 'border-green-500 bg-green-500/10', isSelected && !isCorrect && 'border-red-500 bg-red-500/10')}>
                      {option.text}
                    </div>
                  );
                })}
              </div>
              {question.explanation && <div className="mt-4"><AiAnswerRenderer content={question.explanation} label="Explanation" /></div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
