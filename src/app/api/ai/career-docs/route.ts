import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUniversityFeatureLimit, getUniversityLimitExceededMessage } from '@/lib/rate-limit';
import { gatewayChat } from '@/lib/ai/gateway';
import { MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

type CareerDocType = 'resume' | 'cover_letter';

function clean(value: unknown, limit = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

async function generateCareerDocs(userData: Record<string, string>, jobDescription: string, type: CareerDocType) {
  const prompt =
    type === 'resume'
      ? `Act as an expert career coach and ATS specialist. Create a highly professional, ATS-optimized resume using clear Markdown. Focus on action verbs, skills, measurable impact, and strong project framing.`
      : `Write a professional, persuasive cover letter for the job description, highlighting the student's exact skills and projects that align with the role. Keep it concise and specific.`;

  const result = await gatewayChat({
    provider: 'gemini',
    tier: 'pro',
    messages: [
      {
        role: 'system',
        content: `You create university career documents for students. Return polished Markdown only.\n\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
      },
      {
        role: 'user',
        content: `${prompt}

Student data:
${JSON.stringify(userData, null, 2)}

Job description:
${jobDescription || 'Not provided'}

Rules:
- Do not invent companies, degrees, certificates, or dates.
- If data is missing, add tasteful placeholders the student can edit.
- Keep it ATS-friendly and practical for a university student.`,
      },
    ],
    maxTokens: type === 'resume' ? 3600 : 2400,
    temperature: 0.35,
  });

  return { prompt, markdown: result.text.trim() };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const body = await req.json();
    const type = body.type === 'cover_letter' ? 'cover_letter' : 'resume';
    const userData = {
      name: clean(body.userData?.name, 120),
      contact: clean(body.userData?.contact, 180),
      linkedin: clean(body.userData?.linkedin, 180),
      university: clean(body.userData?.university, 180),
      degree: clean(body.userData?.degree, 180),
      cgpa: clean(body.userData?.cgpa, 50),
      skills: clean(body.userData?.skills, 1000),
      projects: clean(body.userData?.projects, 3000),
    };
    const jobDescription = clean(body.jobDescription, 4000);
    if (!userData.name || !userData.degree)
      return NextResponse.json({ status: 'error', error: 'Name aur degree zaroori hain.' }, { status: 400 });

    const limit = await checkUniversityFeatureLimit(user.id, tier, 'career_docs');
    if (!limit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limit.scope, 'Resume/Cover Letter'),
        },
        { status: 429 }
      );
    }

    const result = await generateCareerDocs(userData, jobDescription, type);
    return NextResponse.json({ status: 'success', data: result });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Career document generate nahi ho saka.' }, { status: 500 });
  }
}
