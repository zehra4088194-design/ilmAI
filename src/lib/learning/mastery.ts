type DbClient = any;

type MasterySignal = {
  studentId: string;
  subjectId?: string | null;
  chapterId?: string | null;
  conceptId?: string | null;
  correct: number;
  incorrect: number;
  source: string;
};

type MistakeInput = {
  studentId: string;
  questionId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  conceptId?: string | null;
  source: string;
  questionText: string;
  selectedAnswer?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
};

function statusFromScore(score: number, attempts: number) {
  if (attempts <= 0) return 'not_started';
  if (score >= 85) return 'mastered';
  if (score >= 55) return 'practiced';
  if (score >= 30) return 'learning';
  return 'needs_revision';
}

export async function updateChapterMastery(db: DbClient, signal: MasterySignal) {
  if (!signal.chapterId) return;
  const { data: previous } = await db
    .from('chapter_mastery')
    .select('attempts, correct_count, incorrect_count')
    .eq('student_id', signal.studentId)
    .eq('chapter_id', signal.chapterId)
    .maybeSingle();

  const attempts = Number(previous?.attempts || 0) + 1;
  const correctCount = Number(previous?.correct_count || 0) + Math.max(0, signal.correct);
  const incorrectCount = Number(previous?.incorrect_count || 0) + Math.max(0, signal.incorrect);
  const total = Math.max(1, correctCount + incorrectCount);
  const mastery = Math.round((correctCount / total) * 100);

  await db.from('chapter_mastery').upsert(
    {
      student_id: signal.studentId,
      chapter_id: signal.chapterId,
      mastery,
      attempts,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      status: statusFromScore(mastery, attempts),
      source_signals: { lastSource: signal.source, lastConceptId: signal.conceptId || null },
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,chapter_id' }
  );
}

export async function recordMistakeWithRevision(db: DbClient, input: MistakeInput) {
  if (!input.questionText.trim()) return;
  const { data: mistake, error } = await db
    .from('student_mistakes')
    .insert({
      student_id: input.studentId,
      question_id: input.questionId || null,
      subject_id: input.subjectId || null,
      chapter_id: input.chapterId || null,
      concept_id: input.conceptId || null,
      source: input.source,
      question_text: input.questionText.slice(0, 4000),
      selected_answer: input.selectedAnswer || null,
      correct_answer: input.correctAnswer || null,
      explanation: input.explanation || null,
      status: 'scheduled',
    })
    .select('id')
    .single();
  if (error || !mistake?.id) return;

  const now = Date.now();
  const intervals = [1, 3, 7, 21];
  await db.from('student_revision_items').insert(
    intervals.map((days) => ({
      student_id: input.studentId,
      mistake_id: mistake.id,
      subject_id: input.subjectId || null,
      chapter_id: input.chapterId || null,
      concept_id: input.conceptId || null,
      title: `Review mistake after ${days} day${days === 1 ? '' : 's'}`,
      prompt: input.questionText.slice(0, 1000),
      due_at: new Date(now + days * 24 * 60 * 60 * 1000).toISOString(),
      interval_days: days,
      status: 'due',
    }))
  );
}
