import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider, getPlatformSettings } from '@/lib/platform-settings/server';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { randomMotivationalQuote } from '@/lib/constants/motivationalQuotes';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';

export const runtime = 'nodejs';
export const maxDuration = 60;

type EmailProfile = {
  id: string;
  email: string;
  full_name: string;
  board: string | null;
  grade_level: string | null;
  education_level?: string | null;
  university_program?: string | null;
  university_semester?: string | null;
  university_courses?: string[] | null;
  subscription_tier: string;
  xp: number;
  streak: number;
};

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!));
}

function todayStartIso() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

async function generateStudyEmail(profile: EmailProfile, quote: string) {
  const context = [
    `Name: ${profile.full_name}`,
    `Education level: ${profile.education_level || 'school'}`,
    `Board: ${profile.board || 'not set'}`,
    `Grade: ${profile.grade_level || 'not set'}`,
    `University program: ${profile.university_program || 'not set'}`,
    `Semester: ${profile.university_semester || 'not set'}`,
    `Courses: ${(profile.university_courses || []).join(', ') || 'not set'}`,
    `XP: ${profile.xp}`,
    `Streak: ${profile.streak}`,
    `Plan: ${profile.subscription_tier}`,
  ].join('\n');

  const provider = await resolveAiRoutingProvider('studyTools');
  const result = await gatewayChat({
    provider,
    strictProvider: true,
    routingPolicy: 'text',
    tier: 'mini',
    messages: [
      {
        role: 'system',
        content:
          'You write short daily study emails for Pakistani students. Return only JSON with keys subject, preview, html. Do not include fake citations. Be warm, concise, and useful.',
      },
      {
        role: 'user',
        content: `Create today's study email using this profile:\n${context}\n\nRequirements:\n- Subject under 70 chars.\n- Preview under 120 chars.\n- HTML with 3 short sections: Today's focus, 25-minute task, Motivation.\n- Use professional, student-friendly English.\n- Mention ilm AI lightly.\n- For the Motivation section, use this exact line (do not rewrite it, translate it, or invent a different one): "${quote}"\n- Include note: "You received this because you allowed daily study emails in cookie preferences."`,
      },
    ],
    maxTokens: 900,
    temperature: 0.7,
  });

  try {
    const parsed = JSON.parse(result.text);
    if (parsed?.subject && parsed?.html) {
      return {
        subject: String(parsed.subject).slice(0, 100),
        preview: String(parsed.preview || '').slice(0, 160),
        html: String(parsed.html),
      };
    }
  } catch {}

  // Fallback used whenever the AI call fails or returns something unparsable — this
  // used to be one hardcoded sentence, so on days the AI call failed (which happens
  // often enough in practice), every recipient saw the exact same "Motivation" line
  // every time. Using the same randomly-picked `quote` passed in from the caller
  // keeps it varied day to day even on the fallback path.
  const name = htmlEscape(profile.full_name || 'Student');
  return {
    subject: "Today's study focus - ilm AI",
    preview: 'A focused study task and motivation for today.',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Hello ${name}</h2><p><strong>Today's focus:</strong> Revise one weak topic for 25 minutes.</p><p><strong>Task:</strong> Solve five MCQs, then record one mistake and its correction.</p><p><strong>Motivation:</strong> ${htmlEscape(quote)}</p><p style="font-size:12px;color:#6b7280">You received this because you allowed daily study emails in cookie preferences.</p></div>`,
  };
}

async function sendStudyEmail(params: { to: string; subject: string; html: string; preview?: string }) {
  await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.preview ? `<span style="display:none!important">${htmlEscape(params.preview)}</span>${params.html}` : params.html,
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Email sending is admin-gated (platform_settings.dailyStudyEmailsEnabled, off by
  // default) — the in-app notification below is deliberately NOT gated by this same
  // switch, per the owner's explicit instruction: the app-side notification must
  // always go out (subject only to the recipient's own notification preference),
  // independent of whether the admin has the email itself turned on.
  const settings = await getPlatformSettings();
  const emailEnabled = settings.dailyStudyEmailsEnabled && isEmailConfigured();

  const supabase = await createAdminClient();
  const todayStart = todayStartIso();
  const { data: profiles, error } = await (supabase.from('profiles') as any)
    .select('id, email, full_name, board, grade_level, education_level, university_program, university_semester, university_courses, subscription_tier, xp, streak, study_email_last_sent_at')
    .eq('study_email_consent', true)
    .is('study_email_unsubscribed_at', null)
    .or(`study_email_last_sent_at.is.null,study_email_last_sent_at.lt.${todayStart}`)
    .limit(50);

  if (error) return NextResponse.json({ status: 'error', error: 'Profiles could not be loaded.' }, { status: 500 });

  let emailsSent = 0;
  let notificationsSent = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const profile of (profiles || []) as EmailProfile[]) {
    // One random pick per recipient per day — not the same quote sent to everyone,
    // and not the same quote repeated day after day (see motivationalQuotes.ts).
    const quote = randomMotivationalQuote();
    try {
      if (emailEnabled) {
        const email = await generateStudyEmail(profile, quote);
        await sendStudyEmail({ to: profile.email, ...email });
        emailsSent++;
      }

      const notificationResult = await createNotificationsIfEnabled(supabase, 'studyReminders', [
        {
          user_id: profile.id,
          type: 'REMINDER',
          title: "Today's study focus",
          message: quote,
          link: '/planner/today',
        },
      ]);
      if (!('skipped' in notificationResult)) notificationsSent++;

      await (supabase.from('profiles') as any)
        .update({ study_email_last_sent_at: new Date().toISOString() })
        .eq('id', profile.id);
    } catch (error) {
      failures.push({ id: profile.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({
    status: 'success',
    emailEnabled,
    emailsSent,
    notificationsSent,
    failed: failures.length,
    failures: failures.slice(0, 5),
  });
}
