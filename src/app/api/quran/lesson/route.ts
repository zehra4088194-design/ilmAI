import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/** Teacher-only: sets the "today's lesson/Surah" text shown to students in a group. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const groupId = String(body?.groupId || '');
  const lesson = String(body?.lesson || '').slice(0, 200);
  if (!groupId) return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });

  const admin = await createAdminClient();
  const { data: group } = await (admin.from('quran_groups') as any)
    .select('id, teacher_id, quran_teachers(profile_id)')
    .eq('id', groupId)
    .maybeSingle();
  const teacher = Array.isArray(group?.quran_teachers) ? group.quran_teachers[0] : group?.quran_teachers;
  if (!group || teacher?.profile_id !== user.id) {
    return NextResponse.json({ error: "Only this group's teacher can set the lesson." }, { status: 403 });
  }

  const { error } = await (admin.from('quran_groups') as any).update({ current_lesson: lesson || null }).eq('id', groupId);
  if (error) return NextResponse.json({ error: 'Could not update the lesson.' }, { status: 500 });
  return NextResponse.json({ status: 'success', lesson });
}
