'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Star, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuizStore } from '@/store/quiz.store';
import { cn } from '@/lib/utils/cn';
import type { QuizQuestion } from '@/types';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';

const AUTO_ADVANCE_CORRECT_MS = 1350;
const AUTO_ADVANCE_WRONG_MS = 2000;

type RewardPath = { startX: number; startY: number; endX: number; endY: number };

function playCorrectChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);

    [659.25, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + 0.3 + index * 0.1);
    });
    window.setTimeout(() => void context.close(), 550);
  } catch {
    // Quiz progress must never depend on browser audio support.
  }
}

export function QuizCard({ question, isLast }: { question: QuizQuestion; isLast: boolean }) {
  const { answerQuestion, nextQuestion, submitQuiz } = useQuizStore();
  const hasAnswered = question.userAnswer !== undefined;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rewardPath, setRewardPath] = useState<RewardPath | null>(null);

  const handleSelect = (optionId: string, event: MouseEvent<HTMLButtonElement>) => {
    if (hasAnswered) return;
    if (optionId === question.correctAnswer) {
      const source = event.currentTarget.getBoundingClientRect();
      const target = document.querySelector<HTMLElement>('[data-xp-target]')?.getBoundingClientRect();
      setRewardPath({
        startX: source.right - 34,
        startY: source.top + source.height / 2,
        endX: target ? target.left + target.width / 2 : window.innerWidth - 90,
        endY: target ? target.top + target.height / 2 : 28,
      });
      playCorrectChime();
    }
    answerQuestion(question.id, optionId);
  };

  useEffect(() => {
    if (!hasAnswered) return;
    const isCorrect = question.userAnswer === question.correctAnswer;
    advanceTimer.current = setTimeout(
      () => {
        if (isLast) submitQuiz();
        else nextQuestion();
      },
      isCorrect ? AUTO_ADVANCE_CORRECT_MS : AUTO_ADVANCE_WRONG_MS
    );

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
    // Store actions are stable, and answer state is intentionally the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, question.id]);

  const difficultyColors = {
    EASY: 'success',
    MEDIUM: 'warning',
    HARD: 'destructive',
    EXPERT: 'destructive',
  } as const;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant={difficultyColors[question.difficulty]}>{question.difficulty}</Badge>
          <Badge variant="outline">
            {question.marks} mark{question.marks > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="mb-6 text-lg leading-relaxed font-medium">
          <AiAnswerRenderer content={question.text} card={false} />
        </div>
        <div className="space-y-3">
          {question.options?.map((option, optionIndex) => {
            const isSelected = question.userAnswer === option.id;
            const isCorrectOption = question.correctAnswer === option.id;
            return (
              <motion.button
                key={option.id}
                whileTap={{ scale: 0.98 }}
                onClick={(event) => handleSelect(option.id, event)}
                disabled={hasAnswered}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all',
                  !hasAnswered && 'border-border hover:bg-muted/30 hover:border-violet-500/50',
                  hasAnswered && isCorrectOption && 'border-green-500 bg-green-500/10',
                  hasAnswered && isSelected && !isCorrectOption && 'border-red-500 bg-red-500/10',
                  hasAnswered && !isSelected && !isCorrectOption && 'border-border opacity-50'
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
                      hasAnswered && isCorrectOption
                        ? 'border-green-500/50 bg-green-500/15 text-green-500'
                        : 'border-border bg-muted/50'
                    )}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <AiAnswerRenderer content={option.text} card={false} />
                  </span>
                </span>
                {hasAnswered && isCorrectOption && <Check className="h-5 w-5 shrink-0 text-green-500" />}
                {hasAnswered && isSelected && !isCorrectOption && <X className="h-5 w-5 shrink-0 text-red-500" />}
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
      <AnimatePresence>
        {rewardPath && (
          <motion.div
            initial={{ x: 0, y: 0, scale: 0.55, opacity: 0 }}
            animate={{
              x: rewardPath.endX - rewardPath.startX,
              y: rewardPath.endY - rewardPath.startY,
              scale: [0.55, 1.25, 1, 0.35],
              opacity: [0, 1, 1, 0],
              rotate: [0, -12, 14, 30],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.22, 0.8, 0.25, 1] }}
            onAnimationComplete={() => setRewardPath(null)}
            className="pointer-events-none fixed z-[300] flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-400 px-2.5 py-1 text-xs font-black text-amber-950 shadow-[0_0_28px_rgba(251,191,36,0.75)]"
            style={{ left: rewardPath.startX, top: rewardPath.startY }}
          >
            <Star className="h-4 w-4 fill-current" /> +2 XP
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
