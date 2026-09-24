import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';
import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { PEER_DOUBT_MODERATION_CHECK_EVERY } from '@/lib/gamification/constants';

/**
 * Phase 3b — adapted from the student-chat safety-check pattern
 * (src/app/api/student-chat/messages/route.ts's moderateIfNeeded), not reused verbatim: that
 * function assumes a 2-party requester/recipient conversation, while a doubt thread is one
 * question with many independent peer answers from different students. Same idea though — sample
 * every N replies instead of checking every one (cost control), classify the recent batch with a
 * cheap model, and escalate a warning into a temporary block on repeat offense — reusing the same
 * AI routing key (studentChatModeration) rather than adding a new one.
 */
export async function moderatePeerRepliesIfNeeded(db: any, doubt: any) {
  try {
    const totalReplies = Number(doubt.peer_reply_count || 0);
    const lastChecked = Number(doubt.moderation_last_checked_count || 0);
    if (totalReplies < PEER_DOUBT_MODERATION_CHECK_EVERY || totalReplies - lastChecked < PEER_DOUBT_MODERATION_CHECK_EVERY) {
      return null;
    }

    const { data: recent } = await db
      .from('doubt_replies')
      .select('id, teacher_id, body, created_at')
      .eq('doubt_id', doubt.id)
      .eq('is_peer_reply', true)
      .order('created_at', { ascending: false })
      .limit(PEER_DOUBT_MODERATION_CHECK_EVERY);

    const transcript = (recent || [])
      .reverse()
      .map((reply: any, index: number) => `${index + 1}. ${reply.body}`)
      .join('\n');

    const platformSettings = await getPlatformSettings();
    const adminProvider = getAdminAiProvider(platformSettings, 'studentChatModeration');
    const providerToUse: AiProviderId = adminProvider === 'local' ? 'groq' : adminProvider;
    const ai = await gatewayChat({
      provider: providerToUse,
      tier: 'mini',
      strictProvider: true,
      routingPolicy: 'text',
      messages: [
        {
          role: 'system',
          content:
            'You are a student safety moderator for an education app doubt-solving board. Return only valid JSON. Be strict about abusive, off-topic, or spam answers, but do not punish short/simple correct answers.',
        },
        {
          role: 'user',
          content: `Classify whether these peer-student answers to a doubt-board question are appropriate academic answers.

Not allowed: abuse/insults, spam/ads, dating/flirting, off-topic content unrelated to the question, or deliberately wrong/trolling answers.
Allowed: short correct answers, partial answers, follow-up clarifying questions.

Return JSON:
{"status":"ok"|"violation","reason":"short reason","alert":"short warning message for the student"}

Recent answers:
${transcript}`,
        },
      ],
      maxTokens: 300,
      temperature: 0.1,
    });

    const verdict = parseAiJson<{ status?: string; reason?: string; alert?: string }>(ai.text, {});
    const reason = verdict.reason || 'One or more recent answers did not look appropriate.';
    const updateBase = { moderation_last_checked_count: totalReplies };

    if (verdict.status !== 'violation') {
      await db.from('doubts').update(updateBase).eq('id', doubt.id);
      return null;
    }

    const warningCount = Number(doubt.moderation_warning_count || 0);
    if (warningCount >= 1) {
      const blockedUntil = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .from('doubts')
        .update({ ...updateBase, moderation_warning_count: warningCount + 1, moderation_blocked_until: blockedUntil })
        .eq('id', doubt.id);
      return { action: 'blocked' as const, reason, blockedUntil };
    }

    await db.from('doubts').update({ ...updateBase, moderation_warning_count: 1 }).eq('id', doubt.id);
    if (doubt.student_id) {
      await createNotificationIfEnabled(db, 'studentChat', {
        user_id: doubt.student_id,
        type: 'SYSTEM',
        title: 'Answers on your question flagged',
        message: verdict.alert || 'Some recent answers on your question did not look appropriate and were reviewed.',
        link: `/doubts?doubtId=${doubt.id}`,
        is_read: false,
      });
    }
    return { action: 'warning' as const, reason };
  } catch (error) {
    console.error('Peer doubt reply moderation skipped:', error);
    return null;
  }
}
