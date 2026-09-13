'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function InstitutionAIWidget({ kind, staffMode = false }: { kind: 'school' | 'college'; staffMode?: boolean }) {
  const [question, setQuestion] = useState(staffMode ? 'Which classes or subjects show the biggest performance or attendance concerns this month?' : 'What are my weakest topics and what should I study next?');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return toast.error('Write a question first.');
    setLoading(true);
    try {
      const res = await fetch('/api/institution/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, question }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Institution AI failed.');
      setAnswer(json.answer || 'No answer was generated.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Institution AI failed.'); }
    finally { setLoading(false); }
  }

  return <Card className="border-violet-500/25 bg-violet-500/5">
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" />{staffMode ? 'Institution AI Analyst' : 'My Institution AI Coach'}</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder={staffMode ? 'Ask about attendance, performance, exams...' : 'Ask about your marks, attendance, exams or weak topics...'} />
      <Button onClick={() => void ask()} disabled={loading} variant="gradient">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ask institution AI</Button>
      {answer && <div className="rounded-xl border bg-background/80 p-4 text-sm leading-6 whitespace-pre-wrap">{answer}</div>}
    </CardContent>
  </Card>;
}
