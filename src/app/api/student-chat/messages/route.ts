import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { createNotificationIfEnabled, createNotificationsIfEnabled } from '@/lib/notifications/preferences';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import { loadArchivedChatMessages, mergeChatMessages } from '@/lib/storage/chat-archive';
import type { SubscriptionTier } from '@/types';

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getApprovedRequest(admin: any, requestId: string, userId: string) {
  const { data } = await admin
    .from('student_chat_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'approved')
    .maybeSingle();
  if (!data || (data.requester_id !== userId && data.recipient_id !== userId)) return null;
  const { data: participants } = await admin
    .from('profiles')
    .select('id, gender')
    .in('id', [data.requester_id, data.recipient_id]);
  if (
    !participants ||
    participants.length !== 2 ||
    !participants[0]?.gender ||
    participants[0].gender !== participants[1]?.gender
  ) {
    return null;
  }
  return data;
}

function isBlocked(request: any) {
  if (!request?.moderation_blocked_until) return false;
  return new Date(request.moderation_blocked_until).getTime() > Date.now();
}

async function notifyBoth(admin: any, request: any, payload: { title: string; message: string }) {
  await createNotificationsIfEnabled(admin, 'studentChat', [
    {
      user_id: request.requester_id,
      type: 'SOCIAL',
      title: payload.title,
      message: payload.message,
      link: `/student-chat?requestId=${request.id}`,
      is_read: false,
    },
    {
      user_id: request.recipient_id,
      type: 'SOCIAL',
      title: payload.title,
      message: payload.message,
      link: `/student-chat?requestId=${request.id}`,
      is_read: false,
    },
  ]);
}

async function moderateIfNeeded(admin: any, request: any) {
  try {
    const { count } = await admin
      .from('student_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', request.id);

    const { data: archiveCounts } = await admin
      .from('chat_archives')
      .select('message_count')
      .eq('archive_type', 'student')
      .eq('conversation_id', request.id);
    const archivedMessages = (archiveCounts || []).reduce(
      (total: number, archive: { message_count?: number }) => total + Number(archive.message_count || 0),
      0
    );
    const totalMessages = (count || 0) + archivedMessages;
    const lastChecked = Number(request.moderation_last_checked_message_count || 0);
    if (totalMessages < 50 || totalMessages - lastChecked < 50) return null;

    const { data: recent } = await admin
      .from('student_chat_messages')
      .select('sender_id, content, created_at')
      .eq('request_id', request.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const transcript = (recent || [])
      .reverse()
      .map(
        (message: any, index: number) =>
          `${index + 1}. ${message.sender_id === request.requester_id ? 'Student A' : 'Student B'}: ${message.content}`
      )
      .join('\n');

    const ai = await gatewayChat({
      provider: 'groq',
      tier: 'mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a student safety moderator for an education app. Return only valid JSON. Be strict about keeping student chat study-related, but do not punish tiny greetings, short jokes, or study logistics.',
        },
        {
          role: 'user',
          content: `Classify whether this student-to-student conversation is mainly study-related.

Allowed: homework, subjects, chapters, tests, notes, schedules, exam motivation, study logistics, quick greetings.
Not allowed: dating/flirting, gossip, abuse, politics unrelated to studies, personal chatting for enjoyment/timepass, buying/selling unrelated things, or any mainly non-study conversation.

Return JSON:
{"status":"study_related"|"off_topic","reason":"short reason","alert":"Roman Urdu warning message for students"}

Conversation:
${transcript}`,
        },
      ],
      maxTokens: 500,
      temperature: 0.1,
    });

    const verdict = parseAiJson<{ status?: string; reason?: string; alert?: string }>(ai.text, {});
    const reason = verdict.reason || 'The conversation does not appear to be study-related.';
    const alert =
      verdict.alert ||
      'Keep the conversation study-related. Another off-topic message will block this chat for two days.';
    const updateBase = {
      moderation_last_checked_message_count: totalMessages,
      moderation_last_reason: reason,
      updated_at: new Date().toISOString(),
    };

    if (verdict.status !== 'off_topic') {
      await admin.from('student_chat_requests').update(updateBase).eq('id', request.id);
      return null;
    }

    const warningCount = Number(request.moderation_warning_count || 0);
    if (warningCount >= 1) {
      const blockedUntil = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      await admin
        .from('student_chat_requests')
        .update({
          ...updateBase,
          moderation_warning_count: warningCount + 1,
          moderation_blocked_until: blockedUntil,
        })
        .eq('id', request.id);
      await notifyBoth(admin, request, {
        title: 'Study buddy chat blocked',
        message: 'This conversation was blocked for two days because it moved away from study-related topics.',
      });
      return {
        action: 'blocked',
        alert: 'This chat was blocked for both students for two days because it moved away from study-related topics.',
        blockedUntil,
      };
    }

    await admin
      .from('student_chat_requests')
      .update({
        ...updateBase,
        moderation_warning_count: 1,
      })
      .eq('id', request.id);
    await notifyBoth(admin, request, {
      title: 'Study chat warning',
      message: alert,
    });
    return { action: 'warning', alert };
  } catch (error) {
    console.error('Student chat moderation skipped:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'A request ID is required' }, { status: 400 });

  const admin = (await createAdminClient()) as any;
  const request = await getApprovedRequest(admin, requestId, user.id);
  if (!request) return NextResponse.json({ error: 'An approved chat was not found.' }, { status: 403 });
  if (isBlocked(request)) {
    return NextResponse.json(
      {
        error: 'This chat is temporarily blocked by moderation.',
        blockedUntil: request.moderation_blocked_until,
      },
      { status: 423 }
    );
  }

  await admin
    .from('student_chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  const { data, error } = await admin
    .from('student_chat_messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: 'Messages could not be loaded. Check migration 011.' }, { status: 500 });
  const archived = await loadArchivedChatMessages<any>(admin, 'student', requestId);
  return NextResponse.json({ messages: mergeChatMessages(archived, data || []) });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { requestId, content } = await req.json();
  const message = typeof content === 'string' ? content.trim() : '';
  if (!requestId || !message)
    return NextResponse.json({ error: 'A request ID and message are required' }, { status: 400 });

  const admin = (await createAdminClient()) as any;
  const { data: profile } = await admin.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
  const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  if (!plan.access.studentChat) {
    return NextResponse.json(
      { error: 'Student chat messaging is locked on this plan. Free users can send and accept connection requests.' },
      { status: 403 }
    );
  }
  const moderationLimit = await checkAiMessageLimit(user.id, tier, 'student_chat_moderation');
  if (!moderationLimit.success) {
    return NextResponse.json(
      { error: await getConfiguredLimitExceededMessage(tier, 'Study buddy safety check') },
      { status: 429 }
    );
  }

  const request = await getApprovedRequest(admin, requestId, user.id);
  if (!request) return NextResponse.json({ error: 'An approved chat was not found.' }, { status: 403 });

  const { data, error } = await admin
    .from('student_chat_messages')
    .insert({ request_id: requestId, sender_id: user.id, content: message })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 500 });

  const recipientId = user.id === request.requester_id ? request.recipient_id : request.requester_id;
  await createNotificationIfEnabled(admin, 'studentChat', {
    user_id: recipientId,
    type: 'SOCIAL',
    title: 'New study buddy message',
    message: message.slice(0, 120),
    link: `/student-chat?requestId=${requestId}`,
    is_read: false,
  });

  const moderation = await moderateIfNeeded(admin, request);

  return NextResponse.json({ message: data, moderation });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { requestId } = await req.json();
  if (!requestId) return NextResponse.json({ error: 'A request ID is required' }, { status: 400 });

  const admin = (await createAdminClient()) as any;
  const request = await getApprovedRequest(admin, requestId, user.id);
  if (!request) return NextResponse.json({ error: 'An approved chat was not found.' }, { status: 403 });

  const { error } = await admin
    .from('student_chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  if (error) return NextResponse.json({ error: 'The read status could not be updated.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
