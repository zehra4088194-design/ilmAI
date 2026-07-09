import type { Database } from '@/lib/supabase/database.types';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'role' | 'board' | 'grade_level'
>;

export function needsProfileCompletion(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.role !== 'student') return false;
  return profile.board === null || profile.grade_level === null;
}
