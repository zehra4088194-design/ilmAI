'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

interface PersonalizationData {
  previousRollNumber?: string;
  totalMarksPercentage?: number;
  targetMarksPercentage?: number;
  optionalSubjectIds?: string[];
}

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function savePersonalization(data: PersonalizationData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  const update: ProfileUpdate = {
    ai_onboarding_complete: true,
  };

  if (data.previousRollNumber) {
    update.previous_roll_number = data.previousRollNumber;
  }
  if (
    data.totalMarksPercentage !== undefined &&
    !Number.isNaN(data.totalMarksPercentage)
  ) {
    update.total_marks_percentage = data.totalMarksPercentage;
  }
  if (
    data.targetMarksPercentage !== undefined &&
    !Number.isNaN(data.targetMarksPercentage)
  ) {
    update.target_marks_percentage = data.targetMarksPercentage;
  }
  if (data.optionalSubjectIds !== undefined) {
    update.optional_subject_ids = data.optionalSubjectIds;
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);

  if (error) {
    console.error('[savePersonalization] Update failed:', error);
    return { error: 'Could not save personalization. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function skipPersonalization() {
  return savePersonalization({});
}
