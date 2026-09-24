'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserInstitutionScope } from './queries';
import { createScopedCompetition } from './create';

export type CompetitionActionState = { success: boolean; message: string };
export const INITIAL_COMPETITION_ACTION_STATE: CompetitionActionState = { success: false, message: '' };

/**
 * Teacher/principal action from the Competition Portal — "Start a Class Challenge" or
 * "Start a School Challenge". Only members of a school/college org can create one, scoped to
 * their own organization (class_vs_class also needs the two section ids from the same org).
 */
export async function createInstitutionCompetition(
  _state: CompetitionActionState,
  formData: FormData
): Promise<CompetitionActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const db = supabase as any;
    const scopeInfo = await getUserInstitutionScope(db, user.id);
    if (!scopeInfo) throw new Error('Only members of a school or college can start a class/school competition.');
    if (!['owner', 'admin', 'teacher'].includes(scopeInfo.role)) {
      throw new Error('Only teachers and principals can start a competition.');
    }

    const competitionType = String(formData.get('competition_type') || '') as 'class_vs_class' | 'school_vs_school';
    if (!['class_vs_class', 'school_vs_school'].includes(competitionType)) throw new Error('Choose a competition type.');
    const title = String(formData.get('title') || '').trim();
    const subjectId = String(formData.get('subject_id') || '').trim();
    const chapterId = String(formData.get('chapter_id') || '').trim();
    const durationHours = Math.min(72, Math.max(1, Number(formData.get('duration_hours')) || 24));
    if (!title || !subjectId || !chapterId) throw new Error('Title, subject, and chapter are required.');

    let sectionAId: string | null = null;
    let sectionBId: string | null = null;
    if (competitionType === 'class_vs_class') {
      sectionAId = String(formData.get('section_a_id') || '').trim() || null;
      sectionBId = String(formData.get('section_b_id') || '').trim() || null;
      if (!sectionAId || !sectionBId || sectionAId === sectionBId) {
        throw new Error('Pick two different sections to compete against each other.');
      }
    }

    await createScopedCompetition({
      competitionType,
      scope: scopeInfo.kind,
      organizationId: scopeInfo.organizationId,
      sectionAId,
      sectionBId,
      title,
      subjectId,
      chapterId,
      durationHours,
      createdBy: user.id,
    });

    revalidatePath('/competitions');
    return { success: true, message: 'Competition created.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not create the competition.' };
  }
}
