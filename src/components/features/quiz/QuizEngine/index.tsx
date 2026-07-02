'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quiz.store';
import { QuizCard } from '@/components/features/quiz/QuizCard';
import { QuizResult } from '@/components/features/quiz/QuizResult';
import { QuizTimer } from '@/components/features/quiz/QuizTimer';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import type { QuizSession } from '@/types';

export function QuizEngine() {
  const { session, initSession, nextQuestion, previousQuestion, submitQuiz, resetQuiz } = useQuizStore();
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('current-quiz');
    if (stored) {
      const parsed: QuizSession = JSON.parse(stored);
      initSession(parsed);
    }
    setLoaded(true);
  }, [initSession]);

  if (!loaded) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!session) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">Koi active quiz nahi hai</p>
      <Button variant="gradient" onClick={() => router.push('/practice')}>Practice Shuru Karo</Button>
    </div>
  );

  if (session.status === 'COMPLETED') {
    return <QuizResult session={session} onRetry={() => { resetQuiz(); router.push('/practice'); }} />;
  }

  const currentQuestion = session.questions[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.questions.length) * 100;
  const isLast = session.currentIndex === session.questions.length - 1;
  const hasAnswered = currentQuestion?.userAnswer !== undefined;

  const handleExpire = () => {
    // Time's up: if unanswered, count it as skipped, then auto-advance (or submit if last)
    if (currentQuestion && !hasAnswered) {
      useQuizStore.setState((state) => {
        if (state.session) state.session.skippedCount += 1;
      });
    }
    if (isLast) submitQuiz();
    else nextQuestion();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Question {session.currentIndex + 1} of {session.questions.length}</span>
            <QuizTimer duration={10} isPaused={hasAnswered} onExpire={handleExpire} resetKey={session.currentIndex} />
          </div>
          <Progress value={progress} />
        </div>
      </div>

      {currentQuestion && <QuizCard question={currentQuestion} />}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={previousQuestion} disabled={session.currentIndex === 0}>
          <ChevronLeft className="w-4 h-4" />Previous
        </Button>
        {isLast ? (
          <Button variant="gradient" onClick={submitQuiz}><Flag className="w-4 h-4" />Submit Quiz</Button>
        ) : (
          <Button variant="gradient" onClick={nextQuestion}>Next<ChevronRight className="w-4 h-4" /></Button>
        )}
      </div>
    </div>
  );
}
