import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';

export const runtime = 'nodejs';

// GET /api/teacher/tests/:id -> full stored paper snapshot, ready to drop
// straight back into the TeacherTestStudio paper renderer.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!(await isTeacherAuthorized(supabase, user.id))) {
      return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });
    }

    const { data, error } = await ((supabase as any).from('teacher_generated_tests') as any)
      .select('id, created_by, paper_snapshot')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Test paper not found.' }, { status: 404 });
    if (data.created_by !== user.id && String((profile as any).role) !== 'admin') {
      return NextResponse.json({ error: 'This test paper does not belong to your account.' }, { status: 403 });
    }

    return NextResponse.json({ data: { ...data.paper_snapshot, testId: data.id } });
  } catch (error) {
    console.error('Teacher test fetch failed:', error);
    return NextResponse.json({ error: 'Could not load this test paper.' }, { status: 500 });
  }
}
