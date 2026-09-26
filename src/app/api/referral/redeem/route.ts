import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { awardReferralBonusCredits } from '@/lib/rate-limit';

/**
 * Phase 7b — records a referred signup and immediately rewards the referrer with bonus AI credits.
 * The referral remains pending until the referee subscribes, but the referrer wins 10 credits right away
 * as soon as a new account joins via their link.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ status: 'success', data: { recorded: false } });

  const normalizedCode = String(code).trim().toUpperCase();
  const admin = (await createAdminClient()) as any;
  const { data: referralCode } = await admin
    .from('referral_codes')
    .select('owner_id')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (!referralCode || referralCode.owner_id === user.id) {
    return NextResponse.json({ status: 'success', data: { recorded: false } });
  }

  const { data: existing } = await admin.from('referral_signups').select('id').eq('referee_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ status: 'success', data: { recorded: false } });

  const { error } = await admin.from('referral_signups').insert({
    referrer_id: referralCode.owner_id,
    referee_id: user.id,
    code_used: normalizedCode,
    status: 'pending',
  });
  if (error) return NextResponse.json({ status: 'success', data: { recorded: false } });

  await awardReferralBonusCredits(referralCode.owner_id, 10);

  return NextResponse.json({ status: 'success', data: { recorded: true, bonusCredits: 10 } });
}
