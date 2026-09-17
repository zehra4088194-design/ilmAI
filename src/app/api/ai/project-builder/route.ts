import { NextRequest, NextResponse } from 'next/server';
import { gatewayChat, GatewayError } from '@/lib/ai/gateway';
import { createClient } from '@/lib/supabase/server';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import {
  checkUniversityFeatureLimit,
  consumeUniversityFeatureCredits,
  getUniversityLimitExceededMessage,
} from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
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

const PROJECT_KEYS: (keyof ProjectContent)[] = [
  'proposal',
  'executive_summary',
  'business_model',
  'timeline',
  'flowchart_mermaid',
  'architecture',
  'budget_estimation',
  'risk_analysis',
  'report',
  'poster_copy',
  'pitch_script',
];

function parseProjectContent(text: string): ProjectContent {
  const generated = parseAiJson<ProjectContent | null>(text, null);
  if (!generated || typeof generated !== 'object') {
    throw new GatewayError('The selected AI service returned invalid project data.', 502);
  }
  for (const key of PROJECT_KEYS) {
    if (typeof generated[key] !== 'string' || !generated[key].trim()) {
      throw new GatewayError('The selected AI service returned incomplete project data.', 502);
    }
  }
  return generated;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
    const body = await req.json();
    const oneLiner = String(body.one_liner || '').trim();
    if (oneLiner.length < 8)
      return NextResponse.json({ status: 'error', error: 'Describe the project idea in a little more detail.' }, { status: 400 });

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

    const projectBuilderProvider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider: projectBuilderProvider,
      strictProvider: true,
      routingPolicy: 'text',
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

    const generated = parseProjectContent(result.text);

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

    await consumeUniversityFeatureCredits(user.id, tier, 'project_builder');
    return NextResponse.json({ status: 'success', data: { id: projectId, content: generated, saved } });
  } catch (error) {
    console.error('Project builder error:', error);
    if (error instanceof GatewayError) {
      return NextResponse.json({ status: 'error', error: 'The selected AI service could not generate the project. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ status: 'error', error: 'The project could not be generated. Please try again.' }, { status: 500 });
  }
}