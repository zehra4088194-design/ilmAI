import { NextRequest, NextResponse } from 'next/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { createClient } from '@/lib/supabase/server';
import { parseAiJson } from '@/lib/utils/json-extract';
import { checkUniversityFeatureLimit, getUniversityLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
    const body = await req.json();
    const oneLiner = String(body.one_liner || '').trim();
    if (oneLiner.length < 8)
      return NextResponse.json({ status: 'error', error: 'Project idea thori detail se likho.' }, { status: 400 });

    const limit = await checkUniversityFeatureLimit(user.id, tier, 'project_builder');
    if (!limit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limit.scope, 'Project Builder'),
        },
        { status: 429 }
      );
    }

    const result = await gatewayChat({
      provider: 'gemini',
      tier: 'pro',
      messages: [
        {
          role: 'system',
          content:
            'You are a university project mentor. Return only valid JSON with the requested keys. Do not fabricate real citations.',
        },
        {
          role: 'user',
          content: `Create a full university project builder pack for this idea: ${oneLiner}
Return ONLY JSON with exactly these string keys:
{
  "proposal": "...",
  "executive_summary": "...",
  "business_model": "...",
  "timeline": "...",
  "flowchart_mermaid": "flowchart TD\\n  A[...] --> B[...]",
  "architecture": "...",
  "budget_estimation": "...",
  "risk_analysis": "...",
  "report": "...",
  "poster_copy": "...",
  "pitch_script": "..."
}

Make every section substantial and practical for a university submission:
- proposal: problem, objectives, scope, methodology
- report: full report-style draft with headings
- architecture: components, data flow, tools
- timeline and budget: realistic but editable
- risk_analysis: table-like text
- pitch_script: 90-second presentation script
Do not add markdown fences.`,
        },
      ],
      maxTokens: 8000,
      temperature: 0.45,
    });
    const generated = parseAiJson<ProjectContent>(result.text, fallbackContent);

    let projectId: string | null = null;
    let saved = false;
    try {
      const { data, error } = await supabase
        .from('ai_projects')
        .insert({
          student_id: user.id,
          one_liner: oneLiner,
          generated_content: generated,
        })
        .select('id')
        .single();
      if (error) throw error;
      projectId = data?.id || null;
      saved = true;
    } catch (saveError) {
      console.warn('Project generated but could not be saved:', saveError);
    }

    return NextResponse.json({ status: 'success', data: { id: projectId, content: generated, saved } });
  } catch (error) {
    console.error('Project builder error:', error);
    return NextResponse.json({ status: 'error', error: 'Project builder generate nahi ho saka.' }, { status: 500 });
  }
}
