import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { explainConceptViaGateway } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier, grade_level').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'explain');
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { concept, subject } = await req.json();
    if (!concept || !subject) return NextResponse.json({ status: 'error', error: 'A concept and subject are required' }, { status: 400 });

    const explanation = await explainConceptViaGateway(concept, subject, profile?.grade_level || 'GRADE_10', 'groq', 'mini');
    return NextResponse.json({ status: 'success', data: { explanation } });
  } catch (error) {
    console.error('Explain API error:', error);
    return NextResponse.json({ status: 'error', error: 'The explanation could not be generated' }, { status: 500 });
  }
}
