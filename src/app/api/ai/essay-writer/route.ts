import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { getUserGradeLevel } from '@/lib/supabase/getUserGradeLevel';
import {
  buildGradeContext,
  isGradeLevel,
  normalizeEssayGradeLevel,
  type EssayWriterResponseData,
  type GradeLevel,
} from '@/lib/utils/buildGradeContext';
import type { SubscriptionTier } from '@/types';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Best-effort history save into public.essays. Never blocks/fails generation
// (mirrors savePresentationHistory in /api/presentation/generate).
async function saveEssayHistory(
  userId: string,
  title: string,
  essayText: string,
  meta: { essayType: string; wordCount: number; language: string; gradeLevel: GradeLevel }
) {
  const admin = createServiceClient() as any;
  const { error } = await admin.from('essays').insert({
    user_id: userId,
    title,
    essay_text: essayText,
    meta,
  });
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'essay_writer');
    if (!limitCheck.success)
      return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const body = await req.json();
    const { topic, wordCount, essayType, language } = body;
    if (!topic) return NextResponse.json({ status: 'error', error: 'An essay topic is required' }, { status: 400 });

    const { gradeLevel: profileGradeLevel } = await getUserGradeLevel(supabase, user.id);
    const gradeLevel: GradeLevel = isGradeLevel(body.gradeLevel)
      ? body.gradeLevel
      : normalizeEssayGradeLevel(profileGradeLevel);

    // Provider is resolved from /admin, never trusted from the client — a request body could
    // previously ask for any provider (e.g. Claude/GPT) with zero server-side check.
    const useProvider: AiProviderId = await resolveAiRoutingProvider('studyTools');
    const useTier: ModelTier = 'mini';
    const targetWords = wordCount || 300;
    const type = essayType || 'general';
    const lang = language === 'urdu' ? 'Roman Urdu mixed with simple English' : 'clear English';
    const gradeContext = buildGradeContext(gradeLevel);

    const result = await gatewayChat({
      provider: useProvider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: useTier,
      messages: [
        {
          role: 'system',
          content: `You are an expert essay-writing tutor for Pakistani board-exam students (grades 9-12). Write well-structured Markdown essays with a clear ## Introduction, body sections with ## or ### headings where natural, and a ## Conclusion. Bold key terms and use short paragraphs. Never return a flat wall of text. ${gradeContext}`,
        },
        {
          role: 'user',
          content: `Write a ${type} essay on the topic: "${topic}". Target length: approximately ${targetWords} words. Write in ${lang}. Structure it clearly with Markdown headings for Introduction, body sections, and Conclusion.`,
        },
      ],
      maxTokens: Math.min(4000, targetWords * 8),
      temperature: 0.7,
    });

    const data: EssayWriterResponseData = { essay: result.text, gradeLevel };
    await consumeAiCredits(user.id, tier, 'essay_writer');
    await saveEssayHistory(user.id, topic, result.text, { essayType: type, wordCount: targetWords, language: lang, gradeLevel }).catch(
      (error) => console.error('Essay history could not be saved (non-fatal):', error)
    );
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Essay writer error:', error);
    return NextResponse.json({ status: 'error', error: 'The essay could not be generated' }, { status: 500 });
  }
}
