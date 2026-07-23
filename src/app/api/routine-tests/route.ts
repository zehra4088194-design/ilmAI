import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

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
    return NextResponse.json({ error: 'This student is not linked to your account.' }, { status: 403 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('routine_tests')
    .select('*')
    .eq('student_id', studentId)
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Routine tests could not be loaded.' }, { status: 500 });
  return NextResponse.json({ tests: data });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { subject, title, scheduledAt, studentId, testType = 'MCQ practice' } = await req.json();
  const targetStudentId = studentId || user.id;
  if (!subject || !title || !scheduledAt) {
    return NextResponse.json({ error: 'Subject, title, and scheduled time are required' }, { status: 400 });
  }
  if (!(await canAccessStudent(targetStudentId, user.id))) {
    return NextResponse.json({ error: 'This student is not linked to your account.' }, { status: 403 });
  }

  const admin = await createAdminClient();
  const normalizedTestType = ['MCQ practice', 'Full test', 'Revision task'].includes(testType) ? testType : 'MCQ practice';
  const testTitle = title.startsWith(`${normalizedTestType}:`) ? title : `${normalizedTestType}: ${title}`;
  const { data, error } = await admin
    .from('routine_tests')
    .insert({ student_id: targetStudentId, subject, title: testTitle, scheduled_at: scheduledAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'The routine test could not be created.' }, { status: 500 });

  if (targetStudentId !== user.id) {
    await createNotificationIfEnabled(admin, 'routineTestAlerts', {
      user_id: targetStudentId,
      type: 'REMINDER',
      title: 'Parent scheduled a test',
      message: `${subject}: ${testTitle}`,
      link: '/practice',
      is_read: false,
    });
  }

  return NextResponse.json({ test: data });
}
