import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLiveClassToken, getLiveClassClientUrl } from '@/lib/live-classes/livekit';
import { getLiveSessionForViewer } from '@/lib/live-classes/access';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });

  const context = await getLiveSessionForViewer(supabase, sessionId, user.id);
  if (!context) return NextResponse.json({ error: 'You are not part of this class.' }, { status: 403 });
  if (context.session.status !== 'live') {
    return NextResponse.json({ error: 'This class has ended.' }, { status: 410 });
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const token = await createLiveClassToken({
    roomName: context.session.livekit_room_name,
    identity: user.id,
    name: profile?.full_name || 'Participant',
    role: context.role,
  });

  return NextResponse.json({
    token,
    url: getLiveClassClientUrl(),
    roomName: context.session.livekit_room_name,
    role: context.role,
    title: context.session.title,
    className: context.className,
  });
}
