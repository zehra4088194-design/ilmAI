import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const service = createServiceClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { refresh = false } = await req.json().catch(() => ({}));

    const [{ data: profile }, { data: inputs }, { data: twin }, { data: cached }] = await Promise.all([
      supabase.from('profiles').select('subscription_tier, board, grade_level, target_marks_percentage, total_marks_percentage').eq('id', user.id).single(),
      supabase.from('career_profile_inputs' as any).select('*').eq('student_id', user.id).maybeSingle(),
      supabase.from('student_digital_twin' as any).select('*').eq('student_id', user.id).maybeSingle(),
      supabase.from('career_recommendations' as any).select('*').eq('student_id', user.id).gt('valid_until', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1),
    ]);

    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'career');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Career AI') }, { status: 429 });
    const inputsRow = inputs as any;
    const cacheRow = cached?.[0] as any;
    if (!refresh && cacheRow && (!inputsRow?.updated_at || new Date(cacheRow.generated_at) >= new Date(inputsRow.updated_at))) {
      return NextResponse.json({ status: 'success', data: cacheRow });
    }

    const fallback = {
      recommended_careers: [{ title: 'Data Analyst', match_score: 72, description: 'Estimated fit based on analytical strengths.', automation_risk: 'medium', avg_salary_pkr: 'varies by city and experience', growth_outlook: 'steady' }],
      recommended_degrees: [],
      recommended_universities: [],
      merit_estimation: {},
      scholarships: [],
      roadmap: [],
    };
    const result = await gatewayChat({
      provider: 'groq',
      tier: 'medium',
      messages: [
        { role: 'system', content: 'You are an evidence-conscious career counselor for Pakistani students. Do not guarantee admissions, salaries, visas, or job outcomes. Use estimates/ranges and flag low-confidence claims. Return only JSON.' },
        { role: 'user', content: JSON.stringify({ profile, inputs, digitalTwin: twin, requiredShape: fallback }) },
      ],
      maxTokens: 3500,
      temperature: 0.35,
    });
    const parsed = parseAiJson(result.text, fallback);
    const payload = {
      student_id: user.id,
      generated_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      ...fallback,
      ...parsed,
    };
    const { data, error } = await service.from('career_recommendations').insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Career generation error:', error);
    return NextResponse.json({ status: 'error', error: 'Career recommendations unavailable' }, { status: 500 });
  }
}
