import { generateConceptsForChapterViaGateway, tagQuestionsWithConceptsViaGateway } from '@/lib/ai/gateway';

type DbClient = any;

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function parseJsonArray(raw: string): any[] {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Generates the curriculum concept list for one chapter via AI and persists it, along with any
 * prerequisite relationships between concepts in that same list. Idempotent: re-running for a
 * chapter that already has concepts upserts on the (chapter_id, title) unique constraint from the
 * learning-system-foundations migration instead of creating duplicates.
 */
export async function generateAndSaveConceptsForChapter(
  db: DbClient,
  chapter: { id: string; name: string; boards?: string[] | null; grade_levels?: string[] | null },
  subject: { id: string; name: string }
) {
  const gradeLevel = chapter.grade_levels?.[0] || null;
  const raw = await generateConceptsForChapterViaGateway({
    chapterName: chapter.name,
    subjectName: subject.name,
    boards: chapter.boards || undefined,
    gradeLevel,
  });
  const items = parseJsonArray(raw);
  const rows = items
    .filter((item) => typeof item?.title === 'string' && item.title.trim())
    .map((item, index) => ({
      subject_id: subject.id,
      chapter_id: chapter.id,
      board: chapter.boards?.[0] || null,
      grade_level: gradeLevel,
      slo_code: typeof item.slo_code === 'string' ? item.slo_code.slice(0, 50) : null,
      title: String(item.title).trim().slice(0, 300),
      description: typeof item.description === 'string' ? item.description.slice(0, 2000) : null,
      difficulty: DIFFICULTIES.has(item.difficulty) ? item.difficulty : 'medium',
      order_index: Number.isFinite(item.order_index) ? Number(item.order_index) : index,
      prerequisite_titles: Array.isArray(item.prerequisite_titles)
        ? item.prerequisite_titles.filter((t: unknown) => typeof t === 'string')
        : [],
    }));
  if (!rows.length) return { conceptsCreated: 0, prerequisitesCreated: 0 };

  const { data: inserted, error } = await db
    .from('curriculum_concepts')
    .upsert(
      rows.map(({ prerequisite_titles: _drop, ...row }) => row),
      { onConflict: 'chapter_id,title' }
    )
    .select('id, title');
  if (error || !inserted?.length) return { conceptsCreated: 0, prerequisitesCreated: 0 };

  const idByTitle = new Map<string, string>(inserted.map((row: any) => [row.title, row.id]));
  const prereqRows: { concept_id: string; prerequisite_concept_id: string }[] = [];
  for (const row of rows) {
    const conceptId = idByTitle.get(row.title);
    if (!conceptId) continue;
    for (const prereqTitle of row.prerequisite_titles) {
      const prereqId = idByTitle.get(prereqTitle);
      if (!prereqId || prereqId === conceptId) continue;
      prereqRows.push({ concept_id: conceptId, prerequisite_concept_id: prereqId });
    }
  }
  if (prereqRows.length) {
    await db.from('curriculum_prerequisites').upsert(prereqRows, { onConflict: 'concept_id,prerequisite_concept_id' });
  }
  return { conceptsCreated: inserted.length, prerequisitesCreated: prereqRows.length };
}

/**
 * Tags a batch of questions from one chapter with the curriculum concept they best match, using
 * the chapter's already-generated concept list. Leaves a question's concept_id untouched (null)
 * when the model finds no good match rather than guessing.
 */
export async function tagQuestionsWithConcepts(
  db: DbClient,
  chapterId: string,
  questions: { id: string; text: string }[]
) {
  if (!questions.length) return { tagged: 0 };
  const { data: concepts } = await db.from('curriculum_concepts').select('id, title').eq('chapter_id', chapterId);
  if (!concepts?.length) return { tagged: 0 };

  const BATCH_SIZE = 20;
  let tagged = 0;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const raw = await tagQuestionsWithConceptsViaGateway({ concepts, questions: batch });
    const matches = parseJsonArray(raw);
    const conceptIds = new Set(concepts.map((c: any) => c.id));
    for (const match of matches) {
      const questionId = typeof match?.questionId === 'string' ? match.questionId : null;
      const conceptId = typeof match?.conceptId === 'string' && conceptIds.has(match.conceptId) ? match.conceptId : null;
      if (!questionId || !conceptId) continue;
      const { error } = await db.from('questions').update({ concept_id: conceptId }).eq('id', questionId);
      if (!error) tagged += 1;
    }
  }
  return { tagged };
}
