import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';

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

async function generateStudyEmail(profile: EmailProfile) {
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

  const result = await gatewayChat({
    provider: 'groq',
    tier: 'mini',
    messages: [
      {
        role: 'system',
        content:
          'You write short daily study emails for Pakistani students. Return only JSON with keys subject, preview, html. Do not include fake citations. Be warm, concise, and useful.',
      },
      {
        role: 'user',
        content: `Create today's study email using this profile:\n${context}\n\nRequirements:\n- Subject under 70 chars.\n- Preview under 120 chars.\n- HTML with 3 short sections: Today's focus, 25-minute task, Motivation.\n- Use professional, student-friendly English.\n- Mention ilm AI lightly.\n- Include note: "You received this because you allowed daily study emails in cookie preferences."`,
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

  const name = htmlEscape(profile.full_name || 'Student');
  return {
    subject: 'Aaj ka study focus - ilm AI',
    preview: 'A focused study task and motivation for today.',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Hello ${name}</h2><p><strong>Today's focus:</strong> Revise one weak topic for 25 minutes.</p><p><strong>Task:</strong> Solve five MCQs, then record one mistake and its correction.</p><p><strong>Motivation:</strong> Small, consistent study sessions lead to meaningful improvement.</p><p style="font-size:12px;color:#6b7280">You received this because you allowed daily study emails in cookie preferences.</p></div>`,
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

  if (!isEmailConfigured()) {
    return NextResponse.json({ status: 'skipped', reason: 'SMTP email service is not configured' });
  }

  const supabase = await createAdminClient();
  const todayStart = todayStartIso();
  const { data: profiles, error } = await (supabase.from('profiles') as any)
    .select('id, email, full_name, board, grade_level, education_level, university_program, university_semester, university_courses, subscription_tier, xp, streak, study_email_last_sent_at')
    .eq('study_email_consent', true)
    .is('study_email_unsubscribed_at', null)
    .or(`study_email_last_sent_at.is.null,study_email_last_sent_at.lt.${todayStart}`)
    .limit(50);

  if (error) return NextResponse.json({ status: 'error', error: 'Profiles could not be loaded.' }, { status: 500 });

  let sent = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (const profile of (profiles || []) as EmailProfile[]) {
    try {
      const email = await generateStudyEmail(profile);
      await sendStudyEmail({ to: profile.email, ...email });
      await (supabase.from('profiles') as any)
        .update({ study_email_last_sent_at: new Date().toISOString() })
        .eq('id', profile.id);
      sent++;
    } catch (error) {
      failures.push({ id: profile.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ status: 'success', sent, failed: failures.length, failures: failures.slice(0, 5) });
}
