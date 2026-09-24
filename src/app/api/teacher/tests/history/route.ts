import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';

export const runtime = 'nodejs';

// GET /api/teacher/tests/history -> the signed-in teacher's previously
// generated papers (lightweight rows, no full snapshot) for the "Previous
// tests" list. Full papers are fetched on demand via /api/teacher/tests/[id].
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

    if (!(await isTeacherAuthorized(supabase, user.id))) {
      return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });
    }

    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 20, 1), 50);
    const { data, error } = await ((supabase as any).from('teacher_generated_tests') as any)
      .select(
        'id, title, institution_name, subject_id, chapter_id, grade_level, theme, difficulty, mcq_count, short_count, long_count, total_marks, duration_minutes, plan_tier, created_at, subjects(name), chapters(name)'
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return NextResponse.json({
      data: (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        institutionName: row.institution_name,
        subjectName: row.subjects?.name || '',
        chapterName: row.chapters?.name || '',
        gradeLevel: row.grade_level,
        theme: row.theme,
        difficulty: row.difficulty,
        counts: { mcq: row.mcq_count, short: row.short_count, long: row.long_count },
        totalMarks: row.total_marks,
        durationMinutes: row.duration_minutes,
        planTier: row.plan_tier,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Teacher test history failed:', error);
    return NextResponse.json({ error: 'Could not load previous tests.' }, { status: 500 });
  }
}
