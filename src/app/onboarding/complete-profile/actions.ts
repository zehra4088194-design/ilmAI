'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';

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
