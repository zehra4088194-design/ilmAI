'use client';
import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface QuizTimerProps {
  duration?: number; // seconds
  isPaused: boolean; // pause once the user has answered
  onExpire: () => void;
  resetKey: string | number; // changes every question -> timer restarts
}

/** 10-second per-question countdown. Stops once answered, auto-advances on expiry. */
export function QuizTimer({ duration = 10, isPaused, onExpire, resetKey }: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    setSecondsLeft(duration);
    hasExpiredRef.current = false;
  }, [resetKey, duration]);

  useEffect(() => {
    if (isPaused) return;
    if (secondsLeft <= 0) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire();
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, isPaused, onExpire]);

  const isUrgent = secondsLeft <= 3 && !isPaused;

  return (
    <span className={cn('flex items-center gap-1 font-medium transition-colors', isUrgent ? 'text-red-500' : 'text-muted-foreground')}>
      <Clock className="w-3.5 h-3.5" />
      {isPaused ? '✓' : `${secondsLeft}s`}
    </span>
  );
}
