'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';

type SubjectiveQuestion = {
  id: string;
  q: string;
  marks: number;
  keyPoints: string[];
  modelAnswer: string;
};

type Evaluation = { score: number; maxScore: number; feedback: string; improvements: string[] };

// University Hub's long/short practice — generates via /api/ai/university-practice
// and grades via the existing /api/ai/grade-answer (already DB-decoupled, reused
// as-is). Same UX shape as AiPracticeHub's subjective flow, scoped by subject name
// instead of a school/college subjectId+chapterId pair.
export function UniversitySubjectivePractice({
  subjectName,
  programName,
  mode,
}: {
  subjectName: string;
  programName: string;
  mode: 'short' | 'long';
}) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<SubjectiveQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const current = questions?.[index] ?? null;

  const start = async (count: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/university-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, subjectName, programName, count }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setQuestions(json.data.questions);
      setIndex(0);
      setAnswer('');
      setEvaluation(null);
    } catch {
      toast.error('Questions could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  const check = async () => {
    if (!current || !answer.trim()) {
      toast.error('Write your answer first.');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch('/api/ai/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: current.q, studentAnswer: answer, modelAnswer: current.modelAnswer, marks: current.marks }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setEvaluation(json.data);
    } catch {
      toast.error('The answer could not be checked.');
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setQuestions(null);
      return;
    }
    setIndex((value) => value + 1);
    setAnswer('');
    setEvaluation(null);
  };

  if (!questions) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Generate {mode === 'short' ? 'short' : 'long'} questions for <span className="text-foreground font-medium">{subjectName}</span>.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {(mode === 'short' ? [5, 8, 10] : [2, 3, 5]).map((count) => (
              <Button key={count} variant="gradient" disabled={loading} onClick={() => start(count)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {count} questions
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Question {index + 1} of {questions.length}
      </p>
      <Card>
        <CardContent className="space-y-4 p-5">
          <Badge variant="outline">{current.marks} marks</Badge>
          <h3 className="text-lg leading-relaxed font-semibold">{current.q}</h3>
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer here..."
            className={mode === 'long' ? 'min-h-56' : 'min-h-36'}
          />
          <div className="flex flex-wrap justify-between gap-3">
            <p className="text-muted-foreground text-xs">{answer.trim().split(/\s+/).filter(Boolean).length} words</p>
            <Button variant="gradient" disabled={checking || !answer.trim()} onClick={check}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Check with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {evaluation && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-sm">Score</p>
                <p className="text-primary text-3xl font-bold">
                  {evaluation.score}/{evaluation.maxScore || current.marks}
                </p>
              </div>
              <Button onClick={next}>{index + 1 >= questions.length ? 'Finish' : 'Next question'}</Button>
            </div>
            <AiAnswerRenderer content={evaluation.feedback} label="AI Feedback" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
