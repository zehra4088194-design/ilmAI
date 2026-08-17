import type { SupabaseClient } from '@supabase/supabase-js';
import { isKidsDashboardEligible } from './eligibility';

/**
 * Server-side resolver: reads the signed-in user's date_of_birth, and — only when
 * that's missing — best-effort checks an active school enrollment's grade_level as
 * a fallback signal. Used by post-login-destination (routing) and the /kids page
 * itself (access guard), so both agree on the same answer.
 */
export async function resolveKidsDashboardEligibility(
  supabase: SupabaseClient,
  userId: string
): Promise<{ eligible: boolean; firstName: string }> {
  const db = supabase as any;
  const { data: profile } = await db
    .from('profiles')
    .select('date_of_birth, full_name')
    .eq('id', userId)
    .maybeSingle();
  const firstName = profile?.full_name?.split(' ')[0] || 'friend';

  if (profile?.date_of_birth) {
    return { eligible: isKidsDashboardEligible({ dateOfBirth: profile.date_of_birth }), firstName };
  }

  // No DOB on file — fall back to an active school enrollment's grade_level, if any.
  const { data: enrollment } = await db
    .from('school_enrollments')
    .select('school_sections(school_classes(grade_level, name))')
    .eq('student_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const section = enrollment?.school_sections
    ? Array.isArray(enrollment.school_sections)
      ? enrollment.school_sections[0]
      : enrollment.school_sections
    : null;
  const klass = section?.school_classes
    ? Array.isArray(section.school_classes)
      ? section.school_classes[0]
      : section.school_classes
    : null;
  const gradeLabel: string | null = klass?.grade_level || klass?.name || null;

  return { eligible: isKidsDashboardEligible({ schoolGradeLevelText: gradeLabel }), firstName };
}
