/**
 * Phase 7c — multi-child comparison data. Reuses the same chapter_mastery table the single-child
 * "weak chapter" insight on the parent dashboard already queries (see parent/page.tsx), just
 * aggregated per-subject-per-child instead of taking the single weakest row. Explicitly returns
 * per-subject averages, not a ranking — the UI frames this as complementary information, not a
 * sibling-vs-sibling score.
 */
export async function getMultiChildSubjectComparison(supabase: any, studentIds: string[]) {
  if (studentIds.length < 2) return null; // Only meaningful with 2+ children.
  const db = supabase as any;
  const { data } = await db
    .from('chapter_mastery')
    .select('student_id, mastery, chapters(subjects(id, name))')
    .in('student_id', studentIds);

  const bySubjectByStudent = new Map<string, Map<string, { total: number; count: number }>>();
  const subjectNames = new Map<string, string>();
  for (const row of data || []) {
    const subject = row.chapters?.subjects;
    const subjectRow = Array.isArray(subject) ? subject[0] : subject;
    if (!subjectRow?.id) continue;
    subjectNames.set(subjectRow.id, subjectRow.name);
    const studentMap = bySubjectByStudent.get(row.student_id) || new Map();
    const current = studentMap.get(subjectRow.id) || { total: 0, count: 0 };
    current.total += Number(row.mastery || 0);
    current.count += 1;
    studentMap.set(subjectRow.id, current);
    bySubjectByStudent.set(row.student_id, studentMap);
  }

  return {
    subjects: Array.from(subjectNames.entries()).map(([id, name]) => ({ id, name })),
    byStudent: Object.fromEntries(
      studentIds.map((studentId) => {
        const studentMap = bySubjectByStudent.get(studentId) || new Map();
        return [
          studentId,
          Object.fromEntries(
            Array.from(studentMap.entries()).map(([subjectId, agg]) => [subjectId, Math.round(agg.total / agg.count)])
          ),
        ];
      })
    ) as Record<string, Record<string, number>>,
  };
}
