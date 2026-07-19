import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ status: 'error', error: 'Code required hai' }, { status: 400 });

    const code = String(inviteCode).trim().toUpperCase();
    const admin = await createAdminClient();
    const { data: invite } = await (admin.from('parent_student_links') as any)
      .select('id, parent_id, student_id, status, invite_code, invite_expires_at')
      .eq('invite_code', code)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) return NextResponse.json({ status: 'error', error: 'Invalid invite code' }, { status: 404 });
    if (invite.parent_id === user.id)
      return NextResponse.json({ status: 'error', error: 'Apna khud ka code use nahi kar sakte' }, { status: 400 });
    if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ status: 'error', error: 'Invite code expire ho gaya' }, { status: 410 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, role, subscription_tier')
      .eq('id', user.id)
      .single();
    if (profile?.role && profile.role !== 'student') {
      return NextResponse.json(
        { status: 'error', error: 'Parent link sirf student account se accept ho sakta hai.' },
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
        message: 'Aap already is parent account se linked ho.',
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
          error: `${plan.name} plan mein maximum ${plan.limits.parentGuardiansMax} guardian link allowed ${plan.limits.parentGuardiansMax === 1 ? 'hai' : 'hain'}.`,
        },
        { status: 403 }
      );
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
      message: 'Parent account se successfully link ho gaya!',
      data: { linkId: invite.id },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ status: 'error', error: 'Invite accept nahi ho saka' }, { status: 500 });
  }
}
