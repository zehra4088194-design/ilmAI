import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Phase 7b — records a referred signup (status 'pending' until the referee's first paid
 * subscription — see the Paddle webhook's transaction.completed handler for the reward step).
 * Silently no-ops (still 200) on any already-referred/self-referral/invalid-code case so the
 * caller (a best-effort fire-and-forget from RegisterForm) never needs special-case handling.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ status: 'success', data: { recorded: false } });

  const admin = (await createAdminClient()) as any;
  const { data: referralCode } = await admin.from('referral_codes').select('owner_id').eq('code', String(code).trim().toUpperCase()).maybeSingle();
  if (!referralCode || referralCode.owner_id === user.id) {
    return NextResponse.json({ status: 'success', data: { recorded: false } });
  }

  const { data: existing } = await admin.from('referral_signups').select('id').eq('referee_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ status: 'success', data: { recorded: false } });

  const { error } = await admin.from('referral_signups').insert({
    referrer_id: referralCode.owner_id,
    referee_id: user.id,
    code_used: String(code).trim().toUpperCase(),
    status: 'pending',
  });
  if (error) return NextResponse.json({ status: 'success', data: { recorded: false } });

  return NextResponse.json({ status: 'success', data: { recorded: true } });
}
