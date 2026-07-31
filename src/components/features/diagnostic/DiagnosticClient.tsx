'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type Question = {
  id: string;
  text: string;
  options: string[];
  subjectName?: string;
  chapterName?: string;
};

type Review = {
  questionId: string;
  text: string;
  options: string[];
  selected: number | null;
  correct: number | null;
  isCorrect: boolean;
  explanation: string;
};

type Result = {
  score: number;
  correct: number;
  total: number;
  mastery: Array<{ chapterId: string; mastery: number }>;
  reviews: Review[];
};

export function DiagnosticClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/diagnostic', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Diagnostic could not be loaded.');
        setQuestions(json.data.questions || []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Diagnostic could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (nextAnswers = answers) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(nextAnswers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Diagnostic could not be submitted.');
      setResult(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Diagnostic could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    const nextAnswers = { ...answers, [questionId]: String(optionIndex) };
    setAnswers(nextAnswers);

    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      if (index < questions.length - 1) {
        setIndex((current) => (current === index ? current + 1 : current));
      } else if (Object.keys(nextAnswers).length === questions.length) {
        void submit(nextAnswers);
      }
    }, 220);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="text-primary h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card>
          <CardContent className="space-y-4 p-5 text-center sm:p-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-2xl font-bold">Diagnostic complete</h1>
            <p className="text-primary text-4xl font-black">{result.score}%</p>
            <p className="text-muted-foreground">
              {result.correct} correct out of {result.total}. Your chapter mastery is now updated.
            </p>
            <Button asChild variant="gradient">
              <Link href="/insights">Open Mastery Map</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {result.reviews?.map((review, reviewIndex) => (
            <Card key={review.questionId}>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <p className="text-sm font-semibold">
                  {reviewIndex + 1}. {review.text}
                </p>
                <p className={review.isCorrect ? 'text-sm text-emerald-500' : 'text-sm text-red-500'}>
                  Your answer:{' '}
                  {review.selected === null
                    ? 'Not answered'
                    : `${String.fromCharCode(65 + review.selected)}. ${review.options[review.selected] || ''}`}
                </p>
                <p className="text-sm text-emerald-500">
                  Correct answer:{' '}
                  {review.correct === null
                    ? 'Answer key unavailable'
                    : `${String.fromCharCode(65 + review.correct)}. ${review.options[review.correct] || ''}`}
                </p>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-semibold">Explanation</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {review.explanation || 'The saved answer key identifies the correct option shown above.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const question = questions[index];
  if (!question) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6 text-center">
          <p className="font-semibold">Diagnostic questions are not available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-primary text-sm font-semibold">Starting diagnostic</p>
        <h1 className="text-2xl font-bold">Your Mastery Map</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {answered}/{questions.length} answered. Your answer automatically opens the next MCQ.
        </p>
      </div>

      <Progress value={((index + 1) / questions.length) * 100} />

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              Question {index + 1} / {questions.length}
            </span>
            <span className="break-words">
              {question.subjectName || 'Subject'} - {question.chapterName || 'Chapter'}
            </span>
          </div>
          <h2 className="text-base leading-7 font-semibold break-words sm:text-lg">{question.text}</h2>
          <div className="grid gap-2">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === String(optionIndex);
              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => selectAnswer(question.id, optionIndex)}
                  className={`flex min-h-12 w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${
                    selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md border text-xs font-bold">
                    {selected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{option}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={index === 0 || submitting} onClick={() => setIndex((value) => value - 1)}>
              Previous
            </Button>
            {submitting && (
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
