'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useQuizStore } from '@/store/quiz.store';
import { cn } from '@/lib/utils/cn';
import type { QuizQuestion } from '@/types';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';

// How long to pause on the answered state before auto-advancing.
// Correct answers move on fast; wrong answers pause longer so the student
// actually reads the correct option before it disappears.
const AUTO_ADVANCE_CORRECT_MS = 900;
const AUTO_ADVANCE_WRONG_MS = 2000;

export function QuizCard({ question, isLast }: { question: QuizQuestion; isLast: boolean }) {
  const { answerQuestion, nextQuestion, submitQuiz } = useQuizStore();
  const hasAnswered = question.userAnswer !== undefined;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelect = (optionId: string) => {
    if (hasAnswered) return;
    answerQuestion(question.id, optionId);
  };

  // Auto-advance once answered — no manual "Next" click needed. Correct →
  // quick move on; wrong → 2s to read the correct answer, then move on.
  useEffect(() => {
    if (!hasAnswered) return;
    const isCorrect = question.userAnswer === question.correctAnswer;
    advanceTimer.current = setTimeout(() => {
      if (isLast) submitQuiz();
      else nextQuestion();
    }, isCorrect ? AUTO_ADVANCE_CORRECT_MS : AUTO_ADVANCE_WRONG_MS);

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, question.id]);

  const difficultyColors = { EASY: 'success', MEDIUM: 'warning', HARD: 'destructive', EXPERT: 'destructive' } as const;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={difficultyColors[question.difficulty]}>{question.difficulty}</Badge>
          <Badge variant="outline">{question.marks} mark{question.marks > 1 ? 's' : ''}</Badge>
        </div>
        <h3 className="text-lg font-medium mb-6 leading-relaxed">{question.text}</h3>
        <div className="space-y-3">
          {question.options?.map((option) => {
            const isSelected = question.userAnswer === option.id;
            const isCorrectOption = question.correctAnswer === option.id;
            const showResult = hasAnswered;
            return (
              <motion.button key={option.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect(option.id)} disabled={hasAnswered}
                className={cn('w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between',
                  !showResult && 'border-border hover:border-violet-500/50 hover:bg-muted/30',
                  showResult && isCorrectOption && 'border-green-500 bg-green-500/10',
                  showResult && isSelected && !isCorrectOption && 'border-red-500 bg-red-500/10',
                  showResult && !isSelected && !isCorrectOption && 'border-border opacity-50')}>
                <span className="text-sm">{option.text}</span>
                {showResult && isCorrectOption && <Check className="w-5 h-5 text-green-500 shrink-0" />}
                {showResult && isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-500 shrink-0" />}
              </motion.button>
            );
          })}
        </div>
        {hasAnswered && question.explanation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
            <AiAnswerRenderer
              content={question.explanation}
              label="Explanation"
              feedback={{ sourceType: 'quiz_explanation', sourceId: question.id }}
            />
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
