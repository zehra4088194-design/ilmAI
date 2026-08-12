import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolContext } from './types';

const YOUNG_LABELS = ['nursery', 'kg', 'kindergarten', 'prep', 'playgroup', 'montessori', 'pre-nursery', 'pre nursery'];

/**
 * Best-effort parse of school_classes.grade_level (free text — schools type "Grade 3", "Class 5",
 * "KG", "Nursery", etc, there's no enum) into a comparable rank. Pre-primary labels rank as 0
 * (eligible for the kids zone). Returns null when the text can't be confidently parsed — callers
 * treat null as NOT eligible (see isEligibleForKidsZone), since showing young-kids content to an
 * unidentified/older student is worse than a school just needing to fill in grade_level properly.
 */
export function parseGradeRank(gradeLevelText: string | null | undefined): number | null {
  if (!gradeLevelText) return null;
  const normalized = gradeLevelText.trim().toLowerCase();
  if (YOUNG_LABELS.some((label) => normalized === label || normalized.includes(label))) return 0;
  const match = normalized.match(/\d+/);
  if (!match) return null;
  const rank = Number(match[0]);
  return Number.isFinite(rank) ? rank : null;
}

export function isEligibleForKidsZone(gradeLevelText: string | null | undefined): boolean {
  const rank = parseGradeRank(gradeLevelText);
  return rank !== null && rank <= 5;
}

/**
 * Kids-zone route is student-only (not parent/teacher/admin) per the master prompt's scope — a
 * parent's trimmed portal is tracking-only, not another copy of student tools.
 */
export async function getStudentKidsZoneEligibility(
  supabase: SupabaseClient,
  context: SchoolContext
): Promise<{ eligible: boolean; gradeLabel: string | null }> {
  if (context.membership.member_role !== 'student') return { eligible: false, gradeLabel: null };
  const db = supabase as any;
  const { data } = await db
    .from('school_enrollments')
    .select('school_sections(school_classes(grade_level, name))')
    .eq('organization_id', context.organization.id)
    .eq('student_id', context.userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const section = data?.school_sections ? (Array.isArray(data.school_sections) ? data.school_sections[0] : data.school_sections) : null;
  const klass = section?.school_classes ? (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes) : null;
  const gradeLabel: string | null = klass?.grade_level || klass?.name || null;
  return { eligible: isEligibleForKidsZone(gradeLabel), gradeLabel };
}
