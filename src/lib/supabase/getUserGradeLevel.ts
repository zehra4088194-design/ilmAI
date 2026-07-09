import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type GradeLevel = Database['public']['Enums']['grade_level'];
export type ClassSelectionGradeLevel =
  | 'GRADE_9'
  | 'GRADE_10'
  | 'GRADE_11'
  | 'GRADE_12';

export const CLASS_SELECTION_GRADE_LEVELS = [
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'GRADE_12',
] as const satisfies readonly GradeLevel[];

export const GRADE_LEVEL_LABELS: Record<ClassSelectionGradeLevel, string> = {
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
  GRADE_12: 'Grade 12',
};

export const CLASS_SELECTION_OPTIONS = [
  { value: 'GRADE_9', label: 'Grade 9', sublabel: 'Matric - 9th Class' },
  { value: 'GRADE_10', label: 'Grade 10', sublabel: 'Matric - 10th Class' },
  { value: 'GRADE_11', label: 'Grade 11', sublabel: 'Intermediate - 1st Year' },
  { value: 'GRADE_12', label: 'Grade 12', sublabel: 'Intermediate - 2nd Year' },
] as const satisfies ReadonlyArray<{
  value: ClassSelectionGradeLevel;
  label: string;
  sublabel: string;
}>;

export interface GetUserGradeLevelResult {
  gradeLevel: GradeLevel | null;
  onboardingCompleted: boolean;
}

export async function getUserGradeLevel(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GetUserGradeLevelResult> {
  if (!userId) {
    return { gradeLevel: null, onboardingCompleted: false };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('grade_level, onboarding_completed')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('[getUserGradeLevel] Failed to fetch profile:', error);
    return { gradeLevel: null, onboardingCompleted: false };
  }

  return {
    gradeLevel: data.grade_level,
    onboardingCompleted: Boolean(data.onboarding_completed),
  };
}
