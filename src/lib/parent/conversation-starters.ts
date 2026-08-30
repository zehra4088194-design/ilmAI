import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { parseAiJson } from '@/lib/utils/json-extract';

const INSIGHT_TYPE = 'guardian_conversation_starters';
const VALIDITY_DAYS = 7;

/**
 * Phase 7d — 2-3 short talking points a parent could ask their child, based on that child's
 * weak-subject data. Cached in the existing ai_insight_cache table (same read-cache-else-generate
 * pattern as /api/insights/roadmap) so a parent revisiting the dashboard within the week doesn't
 * re-trigger an AI call — this reuses that table's existing (student_id, insight_type) shape rather
 * than adding a new cache table.
 */
export async function getGuardianConversationStarters(
  db: any,
  studentId: string,
  weakSubjectName: string,
  weakChapterName: string
): Promise<string[]> {
  const now = new Date().toISOString();
  const { data: cached } = await db
    .from('ai_insight_cache')
    .select('content')
    .eq('student_id', studentId)
    .eq('insight_type', INSIGHT_TYPE)
    .gt('valid_until', now)
    .maybeSingle();
  if (cached?.content?.questions?.length) return cached.content.questions;

  try {
    const provider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider,
      tier: 'mini',
      strictProvider: true,
      routingPolicy: 'text',
      messages: [
        {
          role: 'system',
          content:
            'You write short, warm conversation-starter questions for a parent to ask their child about school. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `The child is currently weak in ${weakSubjectName}${weakChapterName ? `, specifically ${weakChapterName}` : ''}. Write 3 short (under 15 words each), encouraging, non-judgmental questions a parent could ask this week to check in without sounding like an interrogation. Return JSON: {"questions": ["...", "...", "..."]}`,
        },
      ],
      maxTokens: 300,
      temperature: 0.6,
    });
    const parsed = parseAiJson<{ questions?: string[] }>(result.text, {});
    const questions = (parsed.questions || []).slice(0, 3).filter(Boolean);
    if (!questions.length) throw new Error('No questions generated');

    await db.from('ai_insight_cache').upsert(
      {
        student_id: studentId,
        insight_type: INSIGHT_TYPE,
        content: { questions },
        generated_at: now,
        valid_until: new Date(Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'student_id,insight_type' }
    );
    return questions;
  } catch (error) {
    console.error('Guardian conversation starter generation failed:', error);
    // Graceful fallback — never block the parent dashboard on an AI hiccup.
    return [
      `How did ${weakSubjectName} go this week?`,
      `Is there anything about ${weakChapterName || weakSubjectName} I can help explain?`,
    ];
  }
}
