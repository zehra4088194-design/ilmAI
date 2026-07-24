import { nanoid } from 'nanoid';
import { createServiceClient } from '@/lib/supabase/service';
import { buildResourceSourceTest } from '@/lib/resources/source-fallback';
import { fetchResourceContext, getResourceForProcessing } from '@/lib/resources/server';

export type BankMcq = {
  q: string;
  opts: string[];
  correct: number;
  exp: string;
};

export type BankSubjectiveQuestion = {
  q: string;
  marks: number;
  keyPoints: string[];
  modelAnswer: string;
  guide?: string;
};

export type ChapterQuestionPaper = {
  subject: { id: string; name: string };
  chapter: { id: string; name: string };
  mcqs: BankMcq[];
  shortQuestions: BankSubjectiveQuestion[];
  longQuestions: BankSubjectiveQuestion[];
  sourceCount: number;
};

type GenerateOptions = {
  subjectId: string;
  chapterId: string;
  mcqCount: number;
  shortCount: number;
  longCount: number;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function uniqueByQuestion<T extends { q: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeMcq(value: any): BankMcq | null {
  const q = String(value?.q || value?.text || '').trim();
  const rawOptions = value?.opts || value?.options;
  const opts = Array.isArray(rawOptions)
    ? rawOptions.map((option: any) => String(option?.text ?? option)).filter(Boolean).slice(0, 4)
    : [];
  const rawCorrect = value?.correct ?? value?.correctAnswer ?? value?.correct_answer;
  let correct = Number(rawCorrect);
  if (!Number.isInteger(correct) && typeof rawCorrect === 'string') {
    correct = Math.max(0, rawCorrect.toLowerCase().charCodeAt(0) - 97);
  }
  if (!q || opts.length < 2 || !Number.isInteger(correct) || correct < 0 || correct >= opts.length) return null;
  return { q, opts, correct, exp: String(value?.exp || value?.explanation || '') };
}

function normalizeSubjective(value: any, defaultMarks: number): BankSubjectiveQuestion | null {
  const q = String(value?.q || value?.text || '').trim();
  if (!q) return null;
  const keyPoints = Array.isArray(value?.keyPoints)
    ? value.keyPoints.map(String).filter(Boolean)
    : Array.isArray(value?.correct_answer)
      ? value.correct_answer.map(String).filter(Boolean)
      : [];
  const modelAnswer = String(value?.modelAnswer || value?.model_answer || value?.explanation || keyPoints.join(' ')).trim();
  return {
    q,
    marks: Number(value?.marks) || defaultMarks,
    keyPoints,
    modelAnswer,
    guide: value?.guide ? String(value.guide) : undefined,
  };
}

async function sourcePaper(resourceId: string, title: string, counts: GenerateOptions) {
  const resource = await getResourceForProcessing('library', resourceId);
  if (!resource) return null;
  const context = await fetchResourceContext(resource);
  return buildResourceSourceTest(title, context, {
    mcq: Math.max(30, counts.mcqCount),
    short: Math.max(15, counts.shortCount),
    long: Math.max(8, counts.longCount),
  });
}

export async function generateChapterQuestionPaper(options: GenerateOptions): Promise<ChapterQuestionPaper> {
  const db = createServiceClient() as any;
  const [{ data: subject }, { data: chapter }, { data: resources }, { data: databaseQuestions }] = await Promise.all([
    db.from('subjects').select('id, name').eq('id', options.subjectId).maybeSingle(),
    db.from('chapters').select('id, name, subject_id').eq('id', options.chapterId).maybeSingle(),
    db
      .from('library_resources')
      .select('id, title')
      .eq('subject_id', options.subjectId)
      .eq('chapter_id', options.chapterId)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('questions')
      .select('id, type, text, options, correct_answer, explanation, marks, tags')
      .eq('subject_id', options.subjectId)
      .eq('chapter_id', options.chapterId)
      .limit(500),
  ]);

  if (!subject || !chapter || chapter.subject_id !== subject.id) throw new Error('The selected subject or chapter was not found.');
  const resourceRows = resources || [];
  const resourceIds = resourceRows.map((resource: any) => resource.id);
  const { data: cachedBanks } = resourceIds.length
    ? await db
        .from('resource_mcq_sets')
        .select('resource_id, questions, short_questions, long_questions, status')
        .eq('resource_kind', 'library')
        .in('resource_id', resourceIds)
        .eq('status', 'ready')
    : { data: [] };

  const mcqs: BankMcq[] = [];
  const shortQuestions: BankSubjectiveQuestion[] = [];
  const longQuestions: BankSubjectiveQuestion[] = [];

  for (const row of databaseQuestions || []) {
    const type = String(row.type || '').toUpperCase();
    if (type === 'MCQ') {
      const item = normalizeMcq(row);
      if (item) mcqs.push(item);
    } else if (type === 'SHORT') {
      const item = normalizeSubjective(row, 3);
      if (item) shortQuestions.push(item);
    } else if (type === 'LONG') {
      const item = normalizeSubjective(row, 8);
      if (item) longQuestions.push(item);
    }
  }

  const cachedResourceIds = new Set<string>();
  for (const bank of cachedBanks || []) {
    cachedResourceIds.add(bank.resource_id);
    for (const raw of bank.questions || []) {
      const item = normalizeMcq(raw);
      if (item) mcqs.push(item);
    }
    for (const raw of bank.short_questions || []) {
      const item = normalizeSubjective(raw, 3);
      if (item) shortQuestions.push(item);
    }
    for (const raw of bank.long_questions || []) {
      const item = normalizeSubjective(raw, 8);
      if (item) longQuestions.push(item);
    }
  }

  const needsSourceFallback =
    mcqs.length < options.mcqCount ||
    shortQuestions.length < options.shortCount ||
    longQuestions.length < options.longCount;
  if (needsSourceFallback) {
    const candidates = resourceRows
      .filter((resource: any) => !cachedResourceIds.has(resource.id))
      .concat(resourceRows.filter((resource: any) => cachedResourceIds.has(resource.id)))
      .slice(0, 8);
    for (const resource of candidates) {
      try {
        const paper = await sourcePaper(resource.id, resource.title, options);
        if (!paper) continue;
        mcqs.push(...paper.mcqs.map((item) => normalizeMcq(item)).filter(Boolean) as BankMcq[]);
        shortQuestions.push(
          ...paper.shortQs.map((item) => normalizeSubjective(item, 3)).filter(Boolean) as BankSubjectiveQuestion[]
        );
        longQuestions.push(
          ...paper.longQs.map((item) => normalizeSubjective(item, 8)).filter(Boolean) as BankSubjectiveQuestion[]
        );
      } catch (error) {
        console.warn(`Chapter bank skipped resource ${resource.id}:`, error);
      }
      if (
        mcqs.length >= options.mcqCount * 2 &&
        shortQuestions.length >= options.shortCount * 2 &&
        longQuestions.length >= options.longCount * 2
      ) break;
    }
  }

  return {
    subject: { id: subject.id, name: subject.name },
    chapter: { id: chapter.id, name: chapter.name },
    mcqs: shuffle(uniqueByQuestion(mcqs)).slice(0, options.mcqCount),
    shortQuestions: shuffle(uniqueByQuestion(shortQuestions)).slice(0, options.shortCount),
    longQuestions: shuffle(uniqueByQuestion(longQuestions)).slice(0, options.longCount),
    sourceCount: resourceRows.length,
  };
}

export function chapterMcqsToQuizSession(
  paper: ChapterQuestionPaper,
  userId: string,
  sourceTitle = 'Chapter question bank'
) {
  const questions = paper.mcqs.map((question) => {
    const options = question.opts.map((text, optionIndex) => ({
      id: String.fromCharCode(97 + optionIndex),
      text,
    }));
    return {
      id: nanoid(),
      chapterId: paper.chapter.id,
      subjectId: paper.subject.id,
      type: 'MCQ' as const,
      difficulty: 'MEDIUM' as const,
      text: question.q,
      options,
      correctAnswer: options[question.correct]?.id || options[0]?.id || 'a',
      explanation: question.exp || 'Answer verified from the saved chapter source.',
      marks: 1,
      isVerified: true,
      timesAttempted: 0,
      correctRate: 0,
      createdAt: new Date().toISOString(),
    };
  });
  return {
    id: nanoid(),
    userId,
    subjectId: paper.subject.id,
    chapterIds: [paper.chapter.id],
    sourceTitle,
    questions,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    timeSpent: 0,
    status: 'IN_PROGRESS',
    totalMarks: questions.length,
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    mode: 'PRACTICE',
  };
}
