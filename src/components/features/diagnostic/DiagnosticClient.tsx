'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Question = { id: string; text: string; options: string[]; subjectName?: string; chapterName?: string };
type Result = { score: number; correct: number; total: number; mastery: Array<{ chapterId: string; mastery: number }> };

export function DiagnosticClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/diagnostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Diagnostic could not be submitted.');
      setResult(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Diagnostic could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="text-primary h-7 w-7 animate-spin" /></div>;
  if (result) return <Card className="mx-auto max-w-2xl"><CardContent className="space-y-5 p-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h1 className="text-2xl font-bold">Diagnostic complete</h1><p className="text-4xl font-black text-primary">{result.score}%</p><p className="text-muted-foreground">{result.correct} correct out of {result.total}. Your chapter mastery will be used in Insights and your revision roadmap.</p><Button asChild variant="gradient"><Link href="/insights">Open Mastery Map</Link></Button></CardContent></Card>;
  const question = questions[index];
  if (!question) return <Card className="mx-auto max-w-2xl"><CardContent className="p-6 text-center"><p className="font-semibold">Diagnostic questions are not available yet.</p></CardContent></Card>;
  const answered = Object.keys(answers).length;
  return <div className="mx-auto max-w-2xl space-y-5"><div><p className="text-primary text-sm font-semibold">Starting diagnostic</p><h1 className="text-2xl font-bold">Your Mastery Map</h1><p className="text-muted-foreground mt-1">{answered}/{questions.length} answered. Five random saved MCQs are included from each available subject.</p></div><Card><CardContent className="space-y-5 p-5"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Question {index + 1} / {questions.length}</span><span>{question.subjectName || 'Subject'} - {question.chapterName || 'Chapter'}</span></div><h2 className="text-lg font-semibold leading-7">{question.text}</h2><div className="grid gap-2">{question.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.id]: String(optionIndex) }))} className={`rounded-xl border p-3 text-left text-sm transition ${answers[question.id] === String(optionIndex) ? 'border-primary bg-primary/10' : 'hover:bg-muted/60'}`}><strong className="mr-2">{String.fromCharCode(65 + optionIndex)}.</strong>{option}</button>)}</div><div className="flex justify-between gap-3"><Button variant="ghost" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Previous</Button>{index === questions.length - 1 ? <Button variant="gradient" disabled={answered < questions.length || submitting} onClick={() => void submit()}>{submitting ? 'Saving...' : 'See my mastery'}</Button> : <Button disabled={!answers[question.id]} onClick={() => setIndex((value) => value + 1)}>Next</Button>}</div></CardContent></Card></div>;
}
