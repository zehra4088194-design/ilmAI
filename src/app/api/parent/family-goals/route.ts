import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { studentId, title, targetValue, unit, dueDate } = await req.json();
  if (!studentId || !title?.trim()) {
    return NextResponse.json({ error: 'A student and goal title are required' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data: link } = await admin
    .from('parent_student_links')
    .select('id')
    .eq('parent_id', user.id)
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .maybeSingle();
  if (!link) return NextResponse.json({ error: 'This student is not linked to your account.' }, { status: 403 });

  const { data, error } = await (admin.from('parent_family_goals' as any) as any)
    .insert({
      parent_id: user.id,
      student_id: studentId,
      title: title.trim(),
      target_value: Number(targetValue) || 0,
      unit: unit?.trim() || '',
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'The goal could not be created.' }, { status: 500 });
  return NextResponse.json({ goal: data });
}
