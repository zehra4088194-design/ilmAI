import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function canAccessStudent(studentId: string, userId: string) {
  if (studentId === userId) return true;
  const admin = await createAdminClient();
  const { data } = await admin
    .from('parent_student_links')
    .select('id')
    .eq('parent_id', userId)
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .maybeSingle();
  return Boolean(data);
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get('studentId') || user.id;
  if (!(await canAccessStudent(studentId, user.id))) {
    return NextResponse.json({ error: 'Ye student aap se linked nahi hai' }, { status: 403 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('routine_tests')
    .select('*')
    .eq('student_id', studentId)
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Routine tests load nahi hue' }, { status: 500 });
  return NextResponse.json({ tests: data });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { subject, title, scheduledAt, studentId } = await req.json();
  const targetStudentId = studentId || user.id;
  if (!subject || !title || !scheduledAt) {
    return NextResponse.json({ error: 'subject, title, scheduledAt required hain' }, { status: 400 });
  }
  if (!(await canAccessStudent(targetStudentId, user.id))) {
    return NextResponse.json({ error: 'Ye student aap se linked nahi hai' }, { status: 403 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('routine_tests')
    .insert({ student_id: targetStudentId, subject, title, scheduled_at: scheduledAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Routine test create nahi hua' }, { status: 500 });

  if (targetStudentId !== user.id) {
    await admin.from('notifications').insert({
      user_id: targetStudentId,
      type: 'REMINDER',
      title: 'Parent scheduled a test',
      message: `${subject}: ${title}`,
      link: '/routine',
      is_read: false,
    });
  }

  return NextResponse.json({ test: data });
}
