import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const subjectId = req.nextUrl.searchParams.get('subjectId');
  const chapterId = req.nextUrl.searchParams.get('chapterId');
  const conceptId = req.nextUrl.searchParams.get('conceptId');
  const type = req.nextUrl.searchParams.get('type');
  const years = Math.max(1, Math.min(10, Number(req.nextUrl.searchParams.get('years') || 5)));
  const minYear = new Date().getFullYear() - years;

  let query = (supabase as any)
    .from('past_paper_questions')
    .select('id, text, question_type, marks, difficulty, year, board, page_number, source_excerpt, subjects(name), chapters(name)')
    .eq('is_verified', true)
    .gte('year', minYear)
    .order('year', { ascending: false })
    .limit(80);

  if (subjectId) query = query.eq('subject_id', subjectId);
  if (chapterId) query = query.eq('chapter_id', chapterId);
  if (conceptId) query = query.eq('concept_id', conceptId);
  if (type && ['mcq', 'short', 'long', 'numerical', 'other'].includes(type)) query = query.eq('question_type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success', data: { questions: data || [], minYear } });
}
