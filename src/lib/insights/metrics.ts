type QuizMetricInput = {
  score?: number | null;
  correct_count?: number | null;
  incorrect_count?: number | null;
  skipped_count?: number | null;
  completed_at?: string | null;
};

type StudyMetricInput = {
  duration?: number | null;
  date?: string | null;
  created_at?: string | null;
};

export type StudyPulse = {
  recentQuizAverage: number | null;
  scoreTrend: number | null;
  quizzesThisWeek: number;
  studyMinutesThisWeek: number;
  dueRevisions: number;
};

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function quizPercentage(quiz: QuizMetricInput) {
  if (quiz.score !== null && quiz.score !== undefined) {
    const score = Number(quiz.score);
    if (Number.isFinite(score)) return clampPercentage(score);
  }

  const correct = Math.max(0, Number(quiz.correct_count) || 0);
  const incorrect = Math.max(0, Number(quiz.incorrect_count) || 0);
  const skipped = Math.max(0, Number(quiz.skipped_count) || 0);
  const total = correct + incorrect + skipped;
  return total > 0 ? clampPercentage((correct / total) * 100) : null;
}

export function buildStudyPulse(
  quizzes: QuizMetricInput[],
  studySessions: StudyMetricInput[],
  dueRevisions: number,
  now = new Date()
): StudyPulse {
  const quizScores = quizzes.map(quizPercentage).filter((score): score is number => score !== null);
  const currentAverage = average(quizScores.slice(0, 5));
  const previousAverage = average(quizScores.slice(5, 10));
  const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const quizzesThisWeek = quizzes.filter((quiz) => {
    const completedAt = quiz.completed_at ? Date.parse(quiz.completed_at) : Number.NaN;
    return Number.isFinite(completedAt) && completedAt >= weekStart;
  }).length;

  const studySeconds = studySessions.reduce((total, session) => {
    const timestamp = session.created_at || session.date;
    const occurredAt = timestamp ? Date.parse(timestamp) : Number.NaN;
    if (!Number.isFinite(occurredAt) || occurredAt < weekStart) return total;
    return total + Math.max(0, Number(session.duration) || 0);
  }, 0);

  return {
    recentQuizAverage: currentAverage === null ? null : Math.round(currentAverage),
    scoreTrend:
      currentAverage === null || previousAverage === null ? null : Math.round(currentAverage - previousAverage),
    quizzesThisWeek,
    studyMinutesThisWeek: Math.round(studySeconds / 60),
    dueRevisions: Math.max(0, dueRevisions),
  };
}
