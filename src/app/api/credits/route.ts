import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAiCreditStatus } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required hai' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
  return NextResponse.json({ status: 'success', data: await getAiCreditStatus(user.id, tier) });
}
