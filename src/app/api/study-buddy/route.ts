import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Phase 5b — the current user's accepted study buddies (with their streak, for the dashboard
 * side-by-side display) plus any still-pending invite they've generated.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: links } = await db
    .from('buddy_links')
    .select('id, requester_id, buddy_id, status, invite_code, invite_expires_at, linked_at')
    .or(`requester_id.eq.${user.id},buddy_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const accepted = (links || []).filter((l: any) => l.status === 'accepted');
  const pending = (links || []).find((l: any) => l.status === 'pending' && l.requester_id === user.id);

  const buddyIds = accepted.map((l: any) => (l.requester_id === user.id ? l.buddy_id : l.requester_id));
  const { data: profiles } = buddyIds.length
    ? await db.from('profiles').select('id, full_name, avatar_url, streak').in('id', buddyIds)
    : { data: [] };
  const profileById = new Map<string, { full_name?: string; avatar_url?: string; streak?: number }>(
    (profiles || []).map((p: any) => [p.id, p])
  );

  const buddies = accepted.map((link: any) => {
    const buddyId = link.requester_id === user.id ? link.buddy_id : link.requester_id;
    const profile = profileById.get(buddyId);
    return {
      linkId: link.id,
      buddyId,
      fullName: profile?.full_name || 'Study buddy',
      avatarUrl: profile?.avatar_url || null,
      streak: profile?.streak || 0,
    };
  });

  return NextResponse.json({
    status: 'success',
    data: { buddies, pendingInvite: pending ? { code: pending.invite_code, expiresAt: pending.invite_expires_at } : null },
  });
}
