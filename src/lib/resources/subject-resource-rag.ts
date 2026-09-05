import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';

const MAX_QUESTION_MATCHES = 5;
const MAX_CHUNK_MATCHES = 4;
const MAX_CONTEXT_CHARS = 8_000;

type SubjectResourceRagInput = {
  subjectId?: string | null;
  chapterId?: string | null;
  query: string;
};

type QuestionRow = {
  id: string;
  chapter_id: string | null;
  question_type: string | null;
  text: string;
  options: string[] | null;
  correct_answer: unknown;
  explanation: string | null;
  difficulty: string | null;
  marks: number | null;
  similarity: number;
};

type ResourceChunkRow = {
  resource_kind: string;
  resource_id: string;
  resource_title: string | null;
  chunk_index: number;
  page_number: number | null;
  heading: string | null;
  text: string;
  rank: number;
};

function formatQuestionRow(row: QuestionRow) {
  const label = (row.question_type || 'question').toUpperCase();
  const lines = [`[Verified ${label} from the question bank]`, `Q: ${row.text}`];

  if (Array.isArray(row.options) && row.options.length) {
    lines.push(
      `Options: ${row.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join(' | ')}`
    );
  }

  const answer =
    typeof row.correct_answer === 'number' && Array.isArray(row.options)
      ? row.options[row.correct_answer]
      : row.correct_answer;
  if (answer !== null && answer !== undefined && answer !== '') {
    lines.push(`Answer: ${typeof answer === 'string' ? answer : JSON.stringify(answer)}`);
  }
  if (row.explanation) lines.push(`Explanation: ${row.explanation}`);

  return lines.join('\n');
}

/**
 * Grounds the AI Tutor with real, verified content already in Supabase: the
 * per-resource question bank (public.questions — MCQ answer keys and full
 * SHORT/LONG model answers, ranked by text similarity to the student's
 * question) plus, if present, indexed TXT excerpts from resource_source_chunks.
 * Distinct from buildSubjectTutorContext, which reads curated local knowledge
 * files rather than Supabase data.
 */
export async function buildSubjectResourceRagContext({ subjectId, chapterId, query }: SubjectResourceRagInput) {
  if (!subjectId || !query.trim()) return null;
  const admin = createServiceClient();

  const [questionsResult, chunksResult] = await Promise.allSettled([
    admin.rpc('search_subject_questions', {
      p_subject_id: subjectId,
      p_chapter_id: chapterId || null,
      p_query: query,
      p_limit: MAX_QUESTION_MATCHES,
    }),
    admin.rpc('search_subject_resource_chunks', {
      p_subject_id: subjectId,
      p_chapter_id: chapterId || null,
      p_query: query,
      p_limit: MAX_CHUNK_MATCHES,
    }),
  ]);

  const blocks: string[] = [];

  if (questionsResult.status === 'fulfilled' && !questionsResult.value.error) {
    const rows = (questionsResult.value.data || []) as QuestionRow[];
    blocks.push(...rows.map(formatQuestionRow));
  } else if (questionsResult.status === 'fulfilled') {
    console.warn('Subject question-bank RAG unavailable:', questionsResult.value.error);
  }

  if (chunksResult.status === 'fulfilled' && !chunksResult.value.error) {
    const rows = (chunksResult.value.data || []) as ResourceChunkRow[];
    blocks.push(
      ...rows.map((chunk) => {
        const label = chunk.page_number
          ? `${chunk.resource_title || 'Resource'} (p. ${chunk.page_number})`
          : chunk.resource_title || 'Resource';
        return `[Resource: ${label}]\n${chunk.text}`;
      })
    );
  } else if (chunksResult.status === 'fulfilled') {
    console.warn('Subject resource-chunk RAG unavailable:', chunksResult.value.error);
  }

  if (!blocks.length) return null;
  return blocks.join('\n\n').slice(0, MAX_CONTEXT_CHARS);
}
