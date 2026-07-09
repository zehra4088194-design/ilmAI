import type { Database } from '@/lib/supabase/database.types';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'role' | 'board' | 'grade_level' | 'education_level' | 'university_program' | 'university_semester'
>;

export function needsProfileCompletion(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.role !== 'student') return false;
  if (profile.education_level === 'university') {
    return !profile.university_program || !profile.university_semester;
  }
  return profile.board === null || profile.grade_level === null;
}
