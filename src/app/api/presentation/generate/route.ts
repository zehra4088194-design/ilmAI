import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, checkPresentationLimit } from '@/lib/rate-limit';
import { generatePresentationDeck } from '@/lib/presentation/generator';
import type { PresentationGenerateInput } from '@/lib/presentation/types';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

function cleanString(value: unknown, fallback = '', max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const topic = cleanString(body.topic, '', 300);
    if (topic.length < 3) {
      return NextResponse.json({ status: 'error', error: 'Presentation topic likho.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, university_courses, preferred_output_style')
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const requestedSlides = cleanNumber(body.slideCount, 8, 4, 24);
    const presentationLimit = await checkPresentationLimit(user.id, tier, requestedSlides);
    if (!presentationLimit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error:
            presentationLimit.maxSlides <= 0
              ? 'AI Presentation Builder Pro/Elite plans mein unlock hota hai.'
              : requestedSlides > presentationLimit.maxSlides
                ? `Aap ke plan mein maximum ${presentationLimit.maxSlides} slides per presentation hain.`
                : 'Presentations ki monthly plan limit complete ho gayi.',
        },
        { status: tier === 'FREE' ? 403 : 429 }
      );
    }
    const aiLimit = await checkAiMessageLimit(user.id, tier, 'university_presentation');
    if (!aiLimit.success) {
      return NextResponse.json({ status: 'error', error: 'Shared AI credits complete ho gaye.' }, { status: 429 });
    }

    const input: PresentationGenerateInput = {
      topic,
      subject: cleanString(
        body.subject,
        Array.isArray(profile?.university_courses) ? profile?.university_courses?.[0] || 'General' : 'General',
        160
      ),
      slideCount: requestedSlides,
      tone: cleanString(body.tone, 'Professional', 80),
      audienceLevel: cleanString(body.audienceLevel, 'University students', 120),
      language: cleanString(body.language, 'English', 80),
      outputStyle: cleanString(body.outputStyle, profile?.preferred_output_style || 'professional', 80),
      mode: body.mode === 'bulk' ? 'bulk' : 'per-slide',
    };

    const deck = await generatePresentationDeck(input, tier === 'ELITE' ? 'medium' : 'mini');
    return NextResponse.json({ status: 'success', data: { deck, mode: input.mode } });
  } catch (error) {
    console.error('Presentation generate route error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Presentation generate nahi ho saki. AI gateway keys aur rate limit check karo.' },
      { status: 500 }
    );
  }
}
