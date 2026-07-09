'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  CLASS_SELECTION_GRADE_LEVELS,
  type GradeLevel,
} from '@/lib/supabase/getUserGradeLevel';

export interface ActionResult {
  success: boolean;
  error?: string;
}

function isValidGradeLevel(value: unknown): value is (typeof CLASS_SELECTION_GRADE_LEVELS)[number] {
  return (
    typeof value === 'string' &&
    CLASS_SELECTION_GRADE_LEVELS.includes(
      value as (typeof CLASS_SELECTION_GRADE_LEVELS)[number]
    )
  );
}

async function requireStudentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase: null, user: null, error: 'You must be signed in to continue.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[classSelection] Failed to fetch profile:', profileError);
    return { supabase: null, user: null, error: 'Could not load your profile. Please try again.' };
  }

  if (profile.role !== 'student') {
    return { supabase: null, user: null, error: 'Class selection is only available for student accounts.' };
  }

  return { supabase, user, error: null };
}

export async function completeOnboarding(
  gradeLevel: GradeLevel
): Promise<ActionResult> {
  if (!isValidGradeLevel(gradeLevel)) {
    return { success: false, error: 'Invalid grade level provided.' };
  }

  const { supabase, user, error } = await requireStudentProfile();
  if (!supabase || !user) {
    return { success: false, error: error ?? 'Could not save your class. Please try again.' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      grade_level: gradeLevel,
      onboarding_completed: true,
      is_profile_complete: true,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[completeOnboarding] Update failed:', updateError);
    return { success: false, error: 'Could not save your class. Please try again.' };
  }

  revalidatePath('/', 'layout');

  return { success: true };
}

export async function setGradeLevel(
  gradeLevel: GradeLevel
): Promise<ActionResult> {
  if (!isValidGradeLevel(gradeLevel)) {
    return { success: false, error: 'Invalid grade level provided.' };
  }

  const { supabase, user, error } = await requireStudentProfile();
  if (!supabase || !user) {
    return { success: false, error: error ?? 'Could not update your class. Please try again.' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ grade_level: gradeLevel })
    .eq('id', user.id);

  if (updateError) {
    console.error('[setGradeLevel] Update failed:', updateError);
    return { success: false, error: 'Could not update your class. Please try again.' };
  }

  revalidatePath('/', 'layout');

  return { success: true };
}
