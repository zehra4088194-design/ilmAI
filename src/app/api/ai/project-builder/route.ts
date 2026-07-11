import { NextRequest, NextResponse } from 'next/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { createClient } from '@/lib/supabase/server';
import { parseAiJson } from '@/lib/utils/json-extract';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ProjectContent = {
  proposal: string;
  executive_summary: string;
  business_model: string;
  timeline: string;
  flowchart_mermaid: string;
  architecture: string;
  budget_estimation: string;
  risk_analysis: string;
  report: string;
  poster_copy: string;
  pitch_script: string;
};

const fallbackContent: ProjectContent = {
  proposal: 'Project proposal draft could not be generated. Try again with a clearer one-line idea.',
  executive_summary: '',
  business_model: '',
  timeline: '',
  flowchart_mermaid: 'flowchart TD\n  A[Idea] --> B[Plan]\n  B --> C[Build]\n  C --> D[Test]\n  D --> E[Present]',
  architecture: '',
  budget_estimation: '',
  risk_analysis: '',
  report: '',
  poster_copy: '',
  pitch_script: '',
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const limit = await checkAiMessageLimit(user.id, tier, 'project_builder');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Project Builder') }, { status: 429 });
    }

    const body = await req.json();
    const oneLiner = String(body.one_liner || '').trim();
    if (oneLiner.length < 8) return NextResponse.json({ status: 'error', error: 'Project idea thori detail se likho.' }, { status: 400 });

    const result = await gatewayChat({
      provider: 'gemini',
      tier: tier === 'FREE' ? 'mini' : tier === 'ELITE' ? 'pro' : 'medium',
      messages: [
        { role: 'system', content: 'You are a university project mentor. Return only valid JSON with the requested keys. Do not fabricate real citations.' },
        {
          role: 'user',
          content: `Create a full university project builder pack for this idea: ${oneLiner}
Return JSON keys: proposal, executive_summary, business_model, timeline, flowchart_mermaid, architecture, budget_estimation, risk_analysis, report, poster_copy, pitch_script.
Keep it practical, editable, and suitable as a study draft.`,
        },
      ],
      maxTokens: 4096,
      temperature: 0.45,
    });
    const generated = parseAiJson<ProjectContent>(result.text, fallbackContent);
    const { data, error } = await db.from('ai_projects').insert({
      student_id: user.id,
      one_liner: oneLiner,
      generated_content: generated,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ status: 'success', data: { id: data?.id, content: generated } });
  } catch (error) {
    console.error('Project builder error:', error);
    return NextResponse.json({ status: 'error', error: 'Project builder generate nahi ho saka.' }, { status: 500 });
  }
}
