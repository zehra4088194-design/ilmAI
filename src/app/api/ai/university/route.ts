import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
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

const TOOL_LABELS: Record<string, string> = {
  essay: 'AI Essay & Assignment Assistant',
  assignment: 'Assignment Helper',
  presentation: 'AI Presentation Builder',
  viva: 'Viva Preparation Mode',
  research: 'Research / Project Helper',
  planner: 'Semester Study Planner',
};

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : fallback;
}

function cleanNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

async function saveUniversityWork(
  userId: string,
  tool: string,
  title: string,
  input: Record<string, unknown>,
  result: Record<string, unknown>
) {
  const admin = createServiceClient() as any;
  const { error } = await admin.from('university_work_history').insert({
    user_id: userId,
    tool,
    title,
    input_json: input,
    result_json: result,
  });
  if (error) throw error;
}

function buildPrompt(tool: string, input: Record<string, unknown>, profile: Record<string, unknown>) {
  const topic = cleanString(input.topic, 'Selected topic');
  const subject = cleanString(
    input.subject,
    cleanString((profile.university_courses as string[] | undefined)?.[0], 'General')
  );
  const style = cleanString(input.outputStyle, cleanString(profile.preferred_output_style, 'simple'));
  const program = cleanString(profile.university_program, 'University program');
  const semester = cleanString(profile.university_semester, 'Current semester');
  const language = cleanString(input.language, 'English');
  const difficulty = cleanString(input.difficulty, 'Intermediate');
  const wordCount = cleanNumber(input.wordCount, 900, 200, 3000);
  const slideCount = cleanNumber(input.slideCount, 8, 4, 18);
  const tone = cleanString(input.tone, 'professional');
  const audience = cleanString(input.audienceLevel, 'university students');
  const examDate = cleanString(input.examTargetDate, cleanString(profile.university_exam_target_date, 'Not specified'));

  const base = `Student profile:
Education level: university
Program: ${program}
Semester: ${semester}
Courses: ${Array.isArray(profile.university_courses) ? profile.university_courses.join(', ') : 'Not specified'}
Preferred output style: ${style}

Safety rules:
- Do not encourage plagiarism.
- Clearly make this a study draft that the student should review, personalize and verify.
- Do not invent fake citations. If references are needed, add "reference suggestions/placeholders" only.
- Keep output useful for Pakistani/university students but not limited to board exams.`;

  if (tool === 'presentation') {
    return `${base}

Create a professional presentation.
Topic: ${topic}
Subject: ${subject}
Audience level: ${audience}
Slides: ${slideCount}
Tone: ${tone}
Language: ${language}

Return ONLY valid JSON:
{"title":"...","summary":"...","slides":[{"title":"...","keyPoints":["..."],"speakerNotes":"..."}],"vivaQuestions":[{"q":"...","answer":"..."}],"draftNote":"Use this as a study draft. Review, personalize, and verify before submission."}`;
  }

  if (tool === 'viva') {
    return `${base}

Create viva preparation material.
Topic: ${topic}
Subject: ${subject}
Difficulty focus: ${difficulty}
Language: ${language}

Return ONLY valid JSON:
{"title":"...","basic":[{"q":"...","answer":"...","followUp":"..."}],"intermediate":[{"q":"...","answer":"...","followUp":"..."}],"difficult":[{"q":"...","answer":"...","followUp":"..."}],"quickRevisionNotes":["..."],"draftNote":"Use this as a study draft. Review, personalize, and verify before submission."}`;
  }

  if (tool === 'research') {
    return `${base}

Help create a research/project draft.
Topic: ${topic}
Subject: ${subject}
Language: ${language}
Output style: ${style}

Return ONLY valid JSON:
{"titleIdeas":["..."],"abstract":"...","introduction":"...","problemStatement":"...","objectives":["..."],"methodology":["..."],"conclusion":"...","referencesPlaceholder":["Add real source here: ..."],"draftNote":"Use this as a study draft. Verify facts and add real references before submission."}`;
  }

  if (tool === 'planner') {
    return `${base}

Create a subject-wise semester exam preparation plan.
Exam/target date: ${examDate}
Weak areas: ${cleanString(input.weakAreas, 'Not specified')}
Available time: ${cleanString(input.availableTime, '1-2 hours/day')}

Return ONLY valid JSON:
{"title":"...","todayFocus":"...","dailyTasks":[{"day":"...","tasks":["..."],"mcqPractice":"...","flashcards":"...","pastPaper":"..."}],"subjectPlans":[{"subject":"...","focus":"...","actions":["..."]}],"recommendedAction":"...","draftNote":"Use this as a study draft. Review, personalize, and verify before submission."}`;
  }

  return `${base}

Create a structured ${tool === 'assignment' ? 'assignment draft' : 'essay draft'}.
Topic: ${topic}
Subject: ${subject}
Word count: about ${wordCount}
Difficulty: ${difficulty}
Language: ${language}
Output style: ${style}

Return ONLY valid JSON:
{"title":"...","introduction":"...","sections":[{"heading":"...","body":"...","examples":["..."]}],"conclusion":"...","bulletNotes":["..."],"vivaQuestions":[{"q":"...","answer":"..."}],"presentationOutline":[{"slide":"...","points":["..."]}],"draftNote":"Use this as a study draft. Review, personalize, and verify before submission."}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const tool = cleanString(body.tool, 'essay');
    if (!TOOL_LABELS[tool])
      return NextResponse.json({ status: 'error', error: 'Invalid university tool' }, { status: 400 });

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'subscription_tier, education_level, university_program, university_semester, university_courses, university_exam_target_date, preferred_output_style'
      )
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkUniversityFeatureLimit(user.id, tier, `university_${tool}`);
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limitCheck.scope, TOOL_LABELS[tool]),
        },
        { status: 429 }
      );
    }

    const universityProvider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider: universityProvider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: 'pro',
      messages: [
        {
          role: 'system',
          content:
            'You are a university academic study assistant. Return only valid JSON exactly matching the requested schema.',
        },
        { role: 'user', content: buildPrompt(tool, body, (profile || {}) as Record<string, unknown>) },
      ],
      maxTokens:
        tool === 'presentation' || tool === 'research' || tool === 'assignment' || tool === 'essay' ? 7000 : 5000,
      temperature: 0.35,
    });

    const data = parseAiJson<Record<string, unknown>>(result.text, {});
    if (!Object.keys(data).length) {
      return NextResponse.json(
        { status: 'error', error: 'The assistant response could not be parsed. Please try again.' },
        { status: 500 }
      );
    }

    await consumeUniversityFeatureCredits(user.id, tier, `university_${tool}`);
    let saved = true;
    const title = cleanString(body.topic, TOOL_LABELS[tool]).split('\nInstruction:')[0].slice(0, 180);
    const savedInput = {
      topic: title,
      subject: cleanString(body.subject, ''),
      wordCount: cleanNumber(body.wordCount, 900, 200, 3000),
      difficulty: cleanString(body.difficulty, 'Intermediate'),
      language: cleanString(body.language, 'English'),
      slideCount: cleanNumber(body.slideCount, 8, 4, 18),
      tone: cleanString(body.tone, 'Professional'),
      audienceLevel: cleanString(body.audienceLevel, 'University students'),
      weakAreas: cleanString(body.weakAreas, ''),
      availableTime: cleanString(body.availableTime, '1-2 hours/day'),
      outputStyle: cleanString(body.outputStyle, 'simple'),
    };
    try {
      await saveUniversityWork(user.id, tool, title, savedInput, data);
    } catch (error) {
      saved = false;
      console.error('University work history could not be saved:', error);
    }
    return NextResponse.json({ status: 'success', data: { tool, label: TOOL_LABELS[tool], result: data, saved } });
  } catch (error) {
    console.error('University AI route error:', error);
    return NextResponse.json(
      { status: 'error', error: 'The university assistant response could not be generated.' },
      { status: 500 }
    );
  }
}
