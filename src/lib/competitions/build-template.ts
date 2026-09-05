// Builds a competition's fixed question set from the SAME source-grounded chapter question bank
// every other quiz feature already uses (src/lib/tests/chapter-question-bank.ts), exactly the way
// boss_quizzes already stores a fixed quiz_session_template (see 20260710120500_boss_quizzes_avatars.sql).
// No new question-generation path — this only decides which chapter to draw from and shapes the
// result for storage.

import { createServiceClient } from '@/lib/supabase/service';
import { generateChapterQuestionPaper, chapterMcqsToQuizSession } from '@/lib/tests/chapter-question-bank';

export type CompetitionTemplate = ReturnType<typeof chapterMcqsToQuizSession>;

export async function buildCompetitionTemplate(options: {
  subjectId: string;
  chapterId: string;
  questionCount: number;
  title: string;
}): Promise<{ template: CompetitionTemplate; subjectName: string; chapterName: string }> {
  const paper = await generateChapterQuestionPaper({
    subjectId: options.subjectId,
    chapterId: options.chapterId,
    mcqCount: options.questionCount,
    shortCount: 0,
    longCount: 0,
  });
  if (!paper.mcqs.length) throw new Error('This chapter does not have enough source-grounded MCQs yet.');
  const template = chapterMcqsToQuizSession(paper, 'template', options.title);
  return { template, subjectName: paper.subject.name, chapterName: paper.chapter.name };
}

/**
 * Picks a random chapter that already has a ready, sizeable MCQ bank behind it — so Daily
 * Challenge generation never fails for lack of source-grounded questions. Two round-trips instead
 * of a SQL join because resource_mcq_sets.resource_id is a polymorphic reference (resource_kind +
 * resource_id, no declared FK for library_resources to embed through).
 */
export async function pickRandomChapterWithBank(
  minQuestions = 10,
  subjectId?: string
): Promise<{ subjectId: string; chapterId: string } | null> {
  const db = createServiceClient() as any;
  const { data: sets } = await db
    .from('resource_mcq_sets')
    .select('resource_id, questions')
    .eq('resource_kind', 'library')
    .eq('status', 'ready')
    .limit(300);
  const candidates = (sets || []).filter((row: any) => Array.isArray(row.questions) && row.questions.length >= minQuestions);
  if (!candidates.length) return null;

  const resourceIds = candidates.map((row: any) => row.resource_id);
  let resourceQuery = db.from('library_resources').select('id, subject_id, chapter_id').in('id', resourceIds);
  if (subjectId) resourceQuery = resourceQuery.eq('subject_id', subjectId);
  const { data: resources } = await resourceQuery;
  const withChapter = (resources || []).filter((row: any) => row.subject_id && row.chapter_id);
  if (!withChapter.length) return null;

  const pick = withChapter[Math.floor(Math.random() * withChapter.length)];
  return { subjectId: pick.subject_id, chapterId: pick.chapter_id };
}
