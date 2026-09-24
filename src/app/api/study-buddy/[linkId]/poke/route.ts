import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

/**
 * Phase 5c — a lightweight nudge to a study buddy, delivered through the existing push
 * notification pipeline. Rate-limited via the same lib/rate-limit daily-quota mechanism every
 * other feature in this app uses, keyed per buddy pair so poking two different buddies on the
 * same day is fine but poking the same one twice isn't.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: link } = await db
    .from('buddy_links')
    .select('id, requester_id, buddy_id, status')
    .eq('id', linkId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (!link || (link.requester_id !== user.id && link.buddy_id !== user.id)) {
    return NextResponse.json({ status: 'error', error: 'Study buddy link not found.' }, { status: 404 });
  }
  const buddyId = link.requester_id === user.id ? link.buddy_id : link.requester_id;

  const limit = await checkDailyLimit(user.id, `poke:${linkId}`, 1);
  if (!limit.success) {
    return NextResponse.json({ status: 'error', error: 'You already poked this buddy today.' }, { status: 429 });
  }

  const admin = await createAdminClient();
  const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
  await createNotificationIfEnabled(admin, 'directMessages', {
    user_id: buddyId,
    type: 'SOCIAL',
    title: `${profile?.full_name || 'Your study buddy'} poked you!`,
    message: 'Catch up on your streak before the day ends!',
    link: '/dashboard',
    is_read: false,
  });

  return NextResponse.json({ status: 'success' });
}
