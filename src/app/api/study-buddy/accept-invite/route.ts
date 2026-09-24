import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

// Phase 5a — mirrors /api/parent/accept-invite's redemption flow (no plan/tier caps needed here,
// buddy links are a free-tier social feature).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ status: 'error', error: 'An invite code is required' }, { status: 400 });

    const code = String(inviteCode).trim().toUpperCase();
    const admin = (await createAdminClient()) as any;
    const { data: invite } = await admin.from('buddy_links')
      .select('id, requester_id, buddy_id, status, invite_expires_at')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) return NextResponse.json({ status: 'error', error: 'Invalid invite code' }, { status: 404 });
    if (invite.requester_id === user.id) {
      return NextResponse.json({ status: 'error', error: 'You cannot use your own invite code' }, { status: 400 });
    }
    if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ status: 'error', error: 'The invite code has expired' }, { status: 410 });
    }

    const { data: existingLink } = await admin
      .from('buddy_links')
      .select('id')
      .or(
        `and(requester_id.eq.${invite.requester_id},buddy_id.eq.${user.id}),and(requester_id.eq.${user.id},buddy_id.eq.${invite.requester_id})`
      )
      .eq('status', 'accepted')
      .maybeSingle();
    if (existingLink) {
      await admin.from('buddy_links').delete().eq('id', invite.id);
      return NextResponse.json({
        status: 'success',
        message: 'You are already study buddies with this person.',
        data: { linkId: existingLink.id },
      });
    }

    const { error } = await admin
      .from('buddy_links')
      .update({ buddy_id: user.id, status: 'accepted', linked_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (error) throw error;

    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
    await createNotificationIfEnabled(admin, 'directMessages', {
      user_id: invite.requester_id,
      type: 'SOCIAL',
      title: 'New study buddy!',
      message: `${profile?.full_name || 'A student'} accepted your study buddy invite.`,
      link: '/dashboard',
      is_read: false,
    });

    return NextResponse.json({ status: 'success', message: 'You are now study buddies.', data: { linkId: invite.id } });
  } catch (error) {
    console.error('Accept buddy invite error:', error);
    return NextResponse.json({ status: 'error', error: 'The invite could not be accepted' }, { status: 500 });
  }
}
