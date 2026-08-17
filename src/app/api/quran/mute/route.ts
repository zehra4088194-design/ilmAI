import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoomServiceClient } from '@/lib/quran/livekit';
import { getGroupByRoomName } from '@/lib/quran/access';

export const runtime = 'nodejs';

/** Teacher-only: mutes/unmutes one participant's microphone track in their own room. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const roomName = String(body?.roomName || '');
  const participantIdentity = String(body?.participantIdentity || '');
  const trackSid = String(body?.trackSid || '');
  const muted = Boolean(body?.muted);
  if (!roomName || !participantIdentity || !trackSid) {
    return NextResponse.json({ error: 'roomName, participantIdentity, and trackSid are required.' }, { status: 400 });
  }

  const group = await getGroupByRoomName(supabase, roomName);
  if (!group || group.teacherProfileId !== user.id) {
    return NextResponse.json({ error: 'Only this room\'s teacher can mute participants.' }, { status: 403 });
  }

  try {
    const client = getRoomServiceClient();
    await client.mutePublishedTrack(roomName, participantIdentity, trackSid, muted);
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update mute state.' }, { status: 502 });
  }
}
