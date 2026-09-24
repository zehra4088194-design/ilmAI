'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Subject } from '@/types';

export function useSubjects(board?: string, gradeLevel?: string) {
  const supabase = createClient();
  return useQuery<Subject[]>({
    queryKey: ['subjects', board, gradeLevel],
    queryFn: async () => {
      let query = supabase.from('subjects').select('*').eq('is_active', true).order('name');
      if (board) query = query.contains('boards', [board]);
      if (gradeLevel) query = query.contains('grade_levels', [gradeLevel]);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id, name: s.name, slug: s.slug, code: s.code,
        description: s.description ?? undefined, iconUrl: s.icon_url ?? undefined,
        color: s.color, boards: s.boards as Subject['boards'],
        gradeLevels: s.grade_levels as Subject['gradeLevels'],
        isActive: s.is_active, totalChapters: s.total_chapters,
        totalQuestions: s.total_questions, createdAt: s.created_at,
        // --- Added by migration 006_ai_features_onboarding.sql ---
        isOptional: s.is_optional ?? false,
        stream: s.stream ?? undefined,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Optional subjects for a given board/grade — used by the AI-personalization
 *  onboarding modal to let the student pick e.g. Biology vs Computer Science. */
export function useOptionalSubjects(board?: string, gradeLevel?: string) {
  const { data, ...rest } = useSubjects(board, gradeLevel);
  return { data: (data || []).filter(s => s.isOptional), ...rest };
}

export function useChapters(subjectId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['chapters', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase.from('chapters').select('*').eq('subject_id', subjectId).eq('is_active', true).order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
  });
}
