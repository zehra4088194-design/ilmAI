import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { data, error } = await (supabase as any).rpc('college_student_today_homework', {
    p_student_id: user.id,
  });
  if (error) {
    console.error('College today homework lookup failed:', error);
    return NextResponse.json({ error: 'Could not load today\'s homework.' }, { status: 500 });
  }
  return NextResponse.json({ homework: data || [] });
}
