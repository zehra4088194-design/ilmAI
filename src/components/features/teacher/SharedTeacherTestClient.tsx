'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Question = any;

export function SharedTeacherTestClient({ shareId, title, questions, dueAt, alreadyCompleted }: {
  shareId: string;
  title: string;
  questions: Question[];
  dueAt: string | null;
  alreadyCompleted: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadyCompleted);
  const mcqs = useMemo(() => questions.filter((q) => Array.isArray(q.opts) && q.opts.length >= 2), [questions]);
  const written = useMemo(() => questions.filter((q) => !Array.isArray(q.opts)), [questions]);

  const answerKey = (q: Question, index: number) => q.id || `${index}`;

  async function submit() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/teacher/shared-tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, answers }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Test submission failed.');
      setDone(true);
      toast.success(`Submitted. MCQ score: ${json.mcqScore}/${json.mcqTotal}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <Card className="border-emerald-500/30 bg-emerald-500/5"><CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center"><CheckCircle2 className="h-10 w-10 text-emerald-500" /><h2 className="text-xl font-bold">Test submitted</h2><p className="text-muted-foreground text-sm">Your MCQs were scored immediately. Written answers remain available to the teacher for review.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" />{title}</CardTitle><p className="text-muted-foreground text-sm">{questions.length} questions{dueAt ? ` · Due ${new Date(dueAt).toLocaleString()}` : ''}</p></CardHeader>
      </Card>
      {mcqs.length > 0 && <Card><CardHeader><CardTitle className="text-base">MCQs</CardTitle></CardHeader><CardContent className="space-y-4">{mcqs.map((q, index) => <div key={answerKey(q,index)} className="rounded-xl border p-4"><p className="font-semibold">{index + 1}. {q.q}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{q.opts.map((option: string, optIndex: number) => <label key={optIndex} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted/40"><input type="radio" name={`q-${answerKey(q,index)}`} checked={answers[answerKey(q,index)] === optIndex} onChange={() => setAnswers((a) => ({ ...a, [answerKey(q,index)]: optIndex }))} /> <span>{option}</span></label>)}</div></div>)}</CardContent></Card>}
      {written.length > 0 && <Card><CardHeader><CardTitle className="text-base">Written questions</CardTitle></CardHeader><CardContent className="space-y-4">{written.map((q,index) => <div key={answerKey(q,index)} className="rounded-xl border p-4"><p className="font-semibold">{mcqs.length + index + 1}. {q.q}</p><p className="text-muted-foreground mt-1 text-xs">{q.marks || 1} marks</p><Textarea className="mt-3" rows={5} value={String(answers[answerKey(q,index)] ?? '')} onChange={(e) => setAnswers((a) => ({ ...a, [answerKey(q,index)]: e.target.value }))} placeholder="Write your answer..." /></div>)}</CardContent></Card>}
      <div className="sticky bottom-3 flex items-center justify-between rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur"><div className="text-muted-foreground flex items-center gap-2 text-xs"><Clock3 className="h-4 w-4" />Review your answers before submitting.</div><Button variant="gradient" onClick={submit} disabled={submitting}><Send className="h-4 w-4" />{submitting ? 'Submitting...' : 'Submit test'}</Button></div>
    </div>
  );
}
