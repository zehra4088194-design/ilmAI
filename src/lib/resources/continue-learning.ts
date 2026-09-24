export type ContinueLearningItem = {
  subjectName: string;
  subjectSlug: string;
  subjectColor: string | null;
  chapterName: string;
  chapterSlug: string;
  resourceTitle: string;
  lastReadAt: string;
  nextChapter: { name: string; slug: string } | null;
};

/**
 * Most-recently "marked as read" library chapters for a student, each paired
 * with the next chapter in that subject (if any) as a "up next" nudge.
 * Powers the dashboard Continue Learning card and the /study "continue" strip.
 */
export async function getContinueLearningItems(
  supabase: any,
  userId: string,
  { board, gradeLevel, limit = 4 }: { board?: string | null; gradeLevel?: string | null; limit?: number }
): Promise<ContinueLearningItem[]> {
  const { data: reads } = await supabase
    .from('resource_reads')
    .select('resource_id, chapter_id, subject_id, updated_at')
    .eq('user_id', userId)
    .eq('resource_kind', 'library')
    .eq('completed', true)
    .not('chapter_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (!reads?.length) return [];

  // Keep only the most recent read per chapter.
  const latestByChapter = new Map<string, { chapter_id: string; subject_id: string; updated_at: string }>();
  for (const read of reads) {
    if (!latestByChapter.has(read.chapter_id)) latestByChapter.set(read.chapter_id, read);
  }
  const recentChapters = [...latestByChapter.values()].slice(0, limit);
  if (!recentChapters.length) return [];

  const chapterIds = recentChapters.map((item) => item.chapter_id);
  const subjectIds = [...new Set(recentChapters.map((item) => item.subject_id))];

  const [{ data: chapters }, { data: subjects }] = await Promise.all([
    supabase.from('chapters').select('id, subject_id, name, slug, order_index, boards, grade_levels').in('id', chapterIds),
    supabase.from('subjects').select('id, name, slug, color, grade_levels').in('id', subjectIds),
  ]);

  const chapterById = new Map<string, any>((chapters || []).map((c: any) => [c.id, c]));
  const subjectById = new Map<string, any>((subjects || []).map((s: any) => [s.id, s]));

  const nextChapterCandidateIds = recentChapters
    .map((item) => chapterById.get(item.chapter_id))
    .filter(Boolean)
    .map((c: any) => c.subject_id);
  const { data: allChaptersForSubjects } = nextChapterCandidateIds.length
    ? await supabase
        .from('chapters')
        .select('id, subject_id, name, slug, order_index, boards, grade_levels')
        .in('subject_id', [...new Set(nextChapterCandidateIds)])
        .eq('is_active', true)
        .order('order_index', { ascending: true })
    : { data: [] };

  function isChapterVisible(chapter: any, subject: any) {
    const boardVisible = !board || !Array.isArray(chapter.boards) || chapter.boards.length === 0 || chapter.boards.includes(board);
    const subjectHasMultipleGrades = Array.isArray(subject?.grade_levels) && subject.grade_levels.length > 1;
    const chapterHasGrades = Array.isArray(chapter.grade_levels) && chapter.grade_levels.length > 0;
    const gradeVisible =
      !gradeLevel || (chapterHasGrades ? chapter.grade_levels.includes(gradeLevel) : !subjectHasMultipleGrades);
    return boardVisible && gradeVisible;
  }

  const items: ContinueLearningItem[] = [];
  for (const read of recentChapters) {
    const chapter = chapterById.get(read.chapter_id);
    const subject = subjectById.get(read.subject_id);
    if (!chapter || !subject) continue;

    const siblingChapters = (allChaptersForSubjects || [])
      .filter((c: any) => c.subject_id === subject.id && isChapterVisible(c, subject))
      .sort((a: any, b: any) => a.order_index - b.order_index);
    const currentIndex = siblingChapters.findIndex((c: any) => c.id === chapter.id);
    const next = currentIndex >= 0 ? siblingChapters[currentIndex + 1] : null;

    items.push({
      subjectName: subject.name,
      subjectSlug: subject.slug,
      subjectColor: subject.color || null,
      chapterName: chapter.name,
      chapterSlug: chapter.slug,
      resourceTitle: chapter.name,
      lastReadAt: read.updated_at,
      nextChapter: next ? { name: next.name, slug: next.slug } : null,
    });
  }
  return items;
}
