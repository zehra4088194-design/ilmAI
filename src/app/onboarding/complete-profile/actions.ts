'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { OUTPUT_STYLES, type PreferredOutputStyle } from '@/lib/constants/university';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];

export interface ActionResult {
  success: boolean;
  error?: string;
}

function isValidBoard(value: unknown): value is BoardType {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value);
}

function isValidGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && GRADE_LEVELS.some((grade) => grade.value === value);
}

function isValidOutputStyle(value: unknown): value is PreferredOutputStyle {
  return typeof value === 'string' && OUTPUT_STYLES.some((style) => style.value === value);
}

export async function completeProfile(
  board: string,
  gradeLevel: string
): Promise<ActionResult> {
  if (!isValidBoard(board) || !isValidGradeLevel(gradeLevel)) {
    return { success: false, error: 'Board aur grade dono zaroori hain.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to continue.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[completeProfile] Failed to fetch profile:', profileError);
    return { success: false, error: 'Could not load your profile. Please try again.' };
  }

  if (profile.role !== 'student') {
    return { success: false, error: 'Profile completion is only available for student accounts.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      board,
      grade_level: gradeLevel,
      education_level: gradeLevel === 'GRADE_11' || gradeLevel === 'GRADE_12' ? 'college' : 'school',
      is_profile_complete: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[completeProfile] Update failed:', error);
    return { success: false, error: 'Could not save your profile. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function completeUniversityProfile(input: {
  program: string;
  semester: string;
  courses: string[];
  examTargetDate?: string | null;
  preferredOutputStyle: PreferredOutputStyle;
}): Promise<ActionResult> {
  const program = input.program.trim();
  const semester = input.semester.trim();
  const courses = input.courses.map((course) => course.trim()).filter(Boolean).slice(0, 12);
  if (!program || !semester) {
    return { success: false, error: 'Program aur semester zaroori hain.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to continue.' };
  }

  const style = isValidOutputStyle(input.preferredOutputStyle) ? input.preferredOutputStyle : 'simple';
  const { error } = await supabase
    .from('profiles')
    .update({
      education_level: 'university',
      university_program: program,
      university_semester: semester,
      university_courses: courses,
      university_exam_target_date: input.examTargetDate || null,
      preferred_output_style: style,
      board: null,
      grade_level: null,
      is_profile_complete: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[completeUniversityProfile] Update failed:', error);
    return { success: false, error: 'Could not save your university profile. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
