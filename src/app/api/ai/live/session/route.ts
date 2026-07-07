import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GatewayError, mintLiveVoiceToken } from '@/lib/ai/gateway';
import { checkLiveVoiceLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/ai/live/session
// Auth + Elite-only tier gate + daily quota, then mints a short-lived Gemini
// Live ephemeral token (persona locked in server-side) for the browser to
// connect with DIRECTLY. We never see or relay the actual audio — see
// src/lib/ai/gateway.ts for why that's the safer + faster design here.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    if (tier !== 'ELITE') {
      return NextResponse.json(
        { status: 'error', error: 'Live Voice Call sirf Elite members ke liye hai. Upgrade karo AI Teacher se live baat karne ke liye!' },
        { status: 403 }
      );
    }

    const limitCheck = await checkLiveVoiceLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ke live voice calls khatam ho gaye. Kal phir try karo.' }, { status: 429 });
    }

    const { subject } = await req.json().catch(() => ({ subject: undefined }));
    const session = await mintLiveVoiceToken(typeof subject === 'string' ? subject : undefined);

    return NextResponse.json({ status: 'success', data: session });
  } catch (error) {
    console.error('Live voice session error:', error);
    if (error instanceof GatewayError) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: error.status === 401 || error.status === 403 ? 502 : 500 });
    }
    return NextResponse.json({ status: 'error', error: 'Voice call start nahi ho saka. Dobara try karo.' }, { status: 500 });
  }
}
