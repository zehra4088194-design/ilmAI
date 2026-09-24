import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings, parentChildrenCap } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

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
    const admin = await createAdminClient();
    const { data: invite } = await (admin.from('parent_student_links') as any)
      .select('id, parent_id, student_id, status, invite_code, invite_expires_at')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) return NextResponse.json({ status: 'error', error: 'Invalid invite code' }, { status: 404 });
    if (invite.parent_id === user.id)
      return NextResponse.json({ status: 'error', error: 'You cannot use your own invite code' }, { status: 400 });
    if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ status: 'error', error: 'The invite code has expired' }, { status: 410 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, role, subscription_tier')
      .eq('id', user.id)
      .single();
    if (profile?.role && profile.role !== 'student') {
      return NextResponse.json(
        { status: 'error', error: 'A parent link can only be accepted from a student account.' },
        { status: 400 }
      );
    }

    const { data: existingLink } = await (admin.from('parent_student_links') as any)
      .select('id')
      .eq('parent_id', invite.parent_id)
      .eq('student_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (existingLink) {
      await (admin.from('parent_student_links') as any).delete().eq('id', invite.id);
      return NextResponse.json({
        status: 'success',
        message: 'You are already linked to this parent account.',
        data: { linkId: existingLink.id },
      });
    }

    const tier: SubscriptionTier =
      profile?.subscription_tier === 'PRO' || profile?.subscription_tier === 'ELITE'
        ? profile.subscription_tier
        : 'FREE';
    const settings = await getPlatformSettings();
    const plan = getPlanFromSettings(settings, tier);
    const { count: guardianCount } = await admin
      .from('parent_student_links')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'approved');
    if ((guardianCount || 0) >= plan.limits.parentGuardiansMax) {
      return NextResponse.json(
        {
          status: 'error',
          error: `The ${plan.name} plan allows up to ${plan.limits.parentGuardiansMax} guardian ${plan.limits.parentGuardiansMax === 1 ? 'link' : 'links'}.`,
        },
        { status: 403 }
      );
    }

    // The PARENT's own plan (see ParentPlanSettings — profiles.subscription_tier on the parent's
    // OWN row, unrelated to any child's tier above) caps how many children they can link at all.
    const { data: parentProfile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', invite.parent_id)
      .single();
    const parentTier: SubscriptionTier =
      parentProfile?.subscription_tier === 'PRO' || parentProfile?.subscription_tier === 'ELITE'
        ? parentProfile.subscription_tier
        : 'FREE';
    const childrenCap = parentChildrenCap(settings, parentTier);
    if (childrenCap !== null) {
      const { count: childrenCount } = await admin
        .from('parent_student_links')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', invite.parent_id)
        .eq('status', 'approved');
      if ((childrenCount || 0) >= childrenCap) {
        return NextResponse.json(
          {
            status: 'error',
            error: `This parent account's plan allows linking up to ${childrenCap} ${childrenCap === 1 ? 'child' : 'children'}. Upgrade the parent plan to add more.`,
          },
          { status: 403 }
        );
      }
    }

    const { error } = await (admin.from('parent_student_links') as any)
      .update({
        student_id: user.id,
        status: 'approved',
        linked_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (error) throw error;

    await createNotificationIfEnabled(admin, 'parentMessages', {
      user_id: invite.parent_id,
      type: 'SOCIAL',
      title: 'Student linked',
      message: `${profile?.full_name || 'Student'} ne parent invite accept kar liya.`,
      link: `/parent?linkId=${encodeURIComponent(invite.id)}`,
      is_read: false,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Successfully linked to the parent account.',
      data: { linkId: invite.id },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ status: 'error', error: 'The invite could not be accepted' }, { status: 500 });
  }
}
