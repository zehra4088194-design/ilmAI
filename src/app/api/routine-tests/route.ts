import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/routine-tests            -> the logged-in student's own routine tests
// GET /api/routine-tests?studentId= -> a linked parent viewing their child's tests
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get('studentId') || user.id;

  const { data, error } = await supabase
    .from('routine_tests')
    .select('*')
    .eq('student_id', studentId)
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Routine tests load nahi hue' }, { status: 500 });
  return NextResponse.json({ tests: data });
}

// POST /api/routine-tests  body: { subject, title, scheduledAt }
// Students schedule their own routine tests (e.g. from their study routine).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { subject, title, scheduledAt } = await req.json();
  if (!subject || !title || !scheduledAt) {
    return NextResponse.json({ error: 'subject, title, scheduledAt required hain' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('routine_tests')
    .insert({ student_id: user.id, subject, title, scheduled_at: scheduledAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Routine test create nahi hua' }, { status: 500 });
  return NextResponse.json({ test: data });
}
