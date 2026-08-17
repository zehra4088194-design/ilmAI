import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createQuranRoomToken, getLiveKitClientUrl } from '@/lib/quran/livekit';
import { getQuranTeacherContext, getQuranStudentGroups } from '@/lib/quran/access';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const groupId = String(body?.groupId || '');
  if (!groupId) return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const name = profile?.full_name || 'Participant';

  const teacherContext = await getQuranTeacherContext(supabase, user.id);
  const teacherGroup = teacherContext?.groups.find((group) => group.id === groupId);
  if (teacherGroup) {
    const token = await createQuranRoomToken({
      roomName: teacherGroup.livekit_room_name,
      identity: user.id,
      name,
      role: 'teacher',
    });
    return NextResponse.json({ token, url: getLiveKitClientUrl(), roomName: teacherGroup.livekit_room_name, role: 'teacher' });
  }

  const studentGroups = await getQuranStudentGroups(supabase, user.id);
  const studentGroup = studentGroups.find((group) => group.id === groupId);
  if (studentGroup) {
    const token = await createQuranRoomToken({
      roomName: studentGroup.livekit_room_name,
      identity: user.id,
      name,
      role: 'student',
    });
    return NextResponse.json({ token, url: getLiveKitClientUrl(), roomName: studentGroup.livekit_room_name, role: 'student' });
  }

  return NextResponse.json({ error: 'You are not part of this group.' }, { status: 403 });
}
