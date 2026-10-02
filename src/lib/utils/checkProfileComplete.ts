import type { Database } from '@/lib/supabase/database.types';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'role' | 'grade_level' | 'education_level' | 'university_program' | 'university_semester'
>;

export function needsProfileCompletion(profile: Profile | null): boolean {
  if (!profile || profile.role !== 'student') return false;

  if (profile.education_level === 'university') {
    return !profile.university_program?.trim() || !profile.university_semester?.trim();
  }

  return profile.grade_level === null;
}
