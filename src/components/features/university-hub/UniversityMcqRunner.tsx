'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

type McqOption = { id: string; text: string };
type McqQuestion = {
  id: string;
  text: string;
  options: McqOption[];
  correct_answer: string;
  explanation: string | null;
  difficulty: string;
};

// Simple client-side MCQ runner — no session/backend write needed (matches the
// "content free, no cost" decision: these are pre-authored MCQs, not AI-generated,
// so there's nothing to meter or persist). Shuffles once per mount so repeat visits
// don't always see the same order.
export function UniversityMcqRunner({ questions, subjectName }: { questions: McqQuestion[]; subjectName: string }) {
  const shuffled = useMemo(() => [...questions].sort(() => Math.random() - 0.5), [questions]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = shuffled[index];

  if (!current) {
    return <p className="text-muted-foreground text-sm">No MCQs available for this subject yet.</p>;
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <h2 className="text-xl font-bold">Session complete</h2>
          <p className="text-muted-foreground text-sm">
            You scored <span className="text-foreground font-semibold">{score}</span> out of {shuffled.length} on {subjectName}.
          </p>
          <Button
            variant="gradient"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setScore(0);
              setFinished(false);
            }}
          >
            <RotateCcw className="h-4 w-4" /> Retake
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSelect = (optionId: string) => {
    if (selected) return;
    setSelected(optionId);
    if (optionId === current.correct_answer) setScore((value) => value + 1);
  };

  const handleNext = () => {
    if (index + 1 >= shuffled.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Question {index + 1} of {shuffled.length}
        </span>
        <Badge variant="outline" className="capitalize">
          {current.difficulty.toLowerCase()}
        </Badge>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="text-base leading-relaxed font-semibold">{current.text}</h3>
          <div className="space-y-2">
            {current.options.map((option) => {
              const isCorrect = option.id === current.correct_answer;
              const isSelected = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  disabled={!!selected}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl border-2 p-3 text-left text-sm transition-colors',
                    !selected && 'border-border hover:border-primary/40',
                    selected && isCorrect && 'border-emerald-500 bg-emerald-500/10 text-emerald-600',
                    selected && isSelected && !isCorrect && 'border-red-500 bg-red-500/10 text-red-600',
                    selected && !isSelected && !isCorrect && 'border-border opacity-60'
                  )}
                >
                  <span>
                    <span className="mr-2 font-semibold uppercase">{option.id}.</span>
                    {option.text}
                  </span>
                  {selected && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {selected && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {selected && current.explanation && (
            <p className="border-border bg-muted/40 rounded-lg border p-3 text-xs leading-5">{current.explanation}</p>
          )}
        </CardContent>
      </Card>
      <Button variant="gradient" className="w-full" disabled={!selected} onClick={handleNext}>
        {index + 1 >= shuffled.length ? 'Finish' : 'Next question'}
      </Button>
    </div>
  );
}
