// Turns a competition's fixed quiz_session_template into one participant's playable session:
// same question pool for everyone (fair, comparable scores), but question order and each
// question's option order are reshuffled per attempt — the "randomized questions" requirement,
// without touching the shared QuizSession/QuizEngine contract.

import { nanoid } from 'nanoid';
import { shuffle } from '@/lib/tests/paper-selection';
import type { QuizSession, QuizQuestion } from '@/types';

function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion {
  if (!question.options?.length) return question;
  const correctOption = question.options.find((option) => option.id === question.correctAnswer);
  const shuffled = shuffle(question.options).map((option, index) => ({ ...option, id: String.fromCharCode(97 + index) }));
  // Re-map the correct answer to whichever new id the same option text landed on.
  const newCorrectId = shuffled.find((option) => option.text === correctOption?.text)?.id || shuffled[0]?.id || 'a';
  return { ...question, options: shuffled, correctAnswer: newCorrectId, userAnswer: undefined, isCorrect: undefined };
}

export function startCompetitionAttempt(template: any, userId: string): QuizSession {
  const questions = shuffle((template.questions || []) as QuizQuestion[]).map(shuffleQuestionOptions);
  return {
    ...template,
    id: nanoid(),
    userId,
    questions,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    timeSpent: 0,
    status: 'IN_PROGRESS',
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    mode: 'TEST',
  } as QuizSession;
}
