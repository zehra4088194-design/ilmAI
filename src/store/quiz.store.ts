import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { QuizSession, QuizQuestion } from '@/types';
import { enqueueOfflineItem } from '@/lib/offline/sync-queue';

interface QuizState {
  session: QuizSession | null;
  isLoading: boolean;
  showExplanation: boolean;
  initSession: (session: QuizSession) => void;
  answerQuestion: (questionId: string, answer: string | string[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  toggleExplanation: () => void;
  submitQuiz: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>()(
  immer((set) => ({
    session: null,
    isLoading: false,
    showExplanation: false,
    initSession: (session) => set((state) => { state.session = session; state.showExplanation = false; }),
    answerQuestion: (questionId, answer) => set((state) => {
      if (!state.session) return;
      state.session.answers[questionId] = answer;
      const question = state.session.questions.find((q) => q.id === questionId);
      if (question) {
        question.userAnswer = answer;
        const correct = Array.isArray(question.correctAnswer)
          ? JSON.stringify([...question.correctAnswer].sort()) === JSON.stringify([...(answer as string[])].sort())
          : question.correctAnswer === answer;
        question.isCorrect = correct;
        if (correct) state.session.correctCount += 1;
        else state.session.incorrectCount += 1;
      }
    }),
    nextQuestion: () => set((state) => {
      if (!state.session) return;
      if (state.session.currentIndex < state.session.questions.length - 1) {
        state.session.currentIndex += 1;
        state.showExplanation = false;
      }
    }),
    previousQuestion: () => set((state) => {
      if (state.session && state.session.currentIndex > 0) {
        state.session.currentIndex -= 1;
        state.showExplanation = false;
      }
    }),
    goToQuestion: (index) => set((state) => {
      if (state.session) { state.session.currentIndex = index; state.showExplanation = false; }
    }),
    toggleExplanation: () => set((state) => { state.showExplanation = !state.showExplanation; }),
    submitQuiz: () => {
      let completedSession: QuizSession | null = null;
      set((state) => {
        if (!state.session || state.session.status === 'COMPLETED') return;
        state.session.status = 'COMPLETED';
        state.session.completedAt = new Date().toISOString();
        state.session.score = Math.round((state.session.correctCount / state.session.questions.length) * 100);
        state.session.clientIdempotencyKey =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `quiz-${Date.now()}`;
        completedSession = state.session as QuizSession;
      });

      if (completedSession) {
        sessionStorage.setItem('current-quiz', JSON.stringify(completedSession));
        // Offline-first (Phase 1b): if this fetch fails outright (no connection), the completed
        // session is queued and replayed via /api/offline/sync once back online, through the same
        // ledger logic (src/lib/quiz/complete.ts) — see src/lib/offline/sync-queue.ts. A successful
        // HTTP response (even a 4xx/5xx from the server) is NOT queued, only a network failure is.
        fetch('/api/quiz/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completedSession),
        }).catch(() => {
          void enqueueOfflineItem('quiz_complete', completedSession);
        });
      }
    },
    resetQuiz: () => set((state) => { state.session = null; state.showExplanation = false; }),
  }))
);
