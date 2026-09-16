import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError, type AiProviderId } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login is required.' }, { status: 401 });

    const profile = await (supabase.from('profiles') as any)
      .select('full_name,grade_level,education_level,subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = (profile.data?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'ai_tutor');
    if (!limit.success) return NextResponse.json({ error: 'Your AI limit has been reached for this period.' }, { status: 429 });

    const body = await req.json().catch(() => null);
    const applicationType = typeof body?.applicationType === 'string' ? body.applicationType.trim() : 'general';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const extra = typeof body?.extra === 'string' ? body.extra.trim() : '';
    const fromDate = typeof body?.startsOn === 'string' ? body.startsOn : '';
    const toDate = typeof body?.endsOn === 'string' ? body.endsOn : '';
    if (!subject) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });

    const studentName = profile.data?.full_name || 'Student';
    const grade = profile.data?.grade_level || profile.data?.education_level || '';
    const prompt = [
      'Write a formal student application for an educational institution.',
      `Student name: ${studentName}`,
      `Class/level: ${grade}`,
      `Application type: ${applicationType}`,
      `Subject: ${subject}`,
      fromDate ? `Start date: ${fromDate}` : '',
      toDate ? `End date: ${toDate}` : '',
      extra ? `Student notes: ${extra}` : '',
      'Use a polite, natural Pakistani school/college style.',
      'Do not invent a school name, principal name, teacher name, roll number, or medical details.',
      'Return only the application body, ready to edit and submit. Include a respectful salutation and closing, but no Markdown headings.',
    ].filter(Boolean).join('\n');

    const result = await gatewayChat({
      provider: 'groq' as AiProviderId,
      tier: 'mini',
      messages: [
        { role: 'system', content: 'You write concise, respectful student applications. Never fabricate personal facts.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 700,
      temperature: 0.45,
      strictProvider: false,
      routingPolicy: 'text',
    });
    await consumeAiCredits(user.id, tier, 'ai_tutor');
    return NextResponse.json({ text: result.text, providerUsed: result.providerUsed });
  } catch (error) {
    if (error instanceof GatewayError) return NextResponse.json({ error: error.message }, { status: 500 });
    console.error('Student application draft error:', error);
    return NextResponse.json({ error: 'The application draft could not be generated.' }, { status: 500 });
  }
}
