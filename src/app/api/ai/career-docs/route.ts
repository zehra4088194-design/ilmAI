import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

type CareerDocType = 'resume' | 'cover_letter';

function clean(value: unknown, limit = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

async function generateCareerDocs(userData: Record<string, string>, jobDescription: string, type: CareerDocType) {
  const prompt = type === 'resume'
    ? 'Act as an expert career coach and ATS specialist. Take the following student data and format it into a highly professional, ATS-optimized resume using clear Markdown. Focus on action verbs and impact.'
    : "Write a professional, persuasive cover letter for the following job description, highlighting the student's specific skills and projects that align with the role. Keep it concise. Do not use generic fluff.";

  await new Promise((resolve) => setTimeout(resolve, 900));
  const skills = userData.skills || 'Communication, research, problem solving';
  const projects = userData.projects || 'Academic projects and coursework';

  if (type === 'cover_letter') {
    return {
      prompt,
      markdown: `# Cover Letter\n\nDear Hiring Manager,\n\nI am writing to apply for the role described in your job posting. My academic background in **${userData.degree || 'my degree'}** from **${userData.university || 'my university'}** has helped me build strong foundations in ${skills}.\n\nThrough projects such as ${projects}, I developed practical problem-solving, documentation, and teamwork skills that align with your requirements. I am especially interested in contributing to this role because it matches my learning path and career goals.\n\nThank you for considering my application. I would welcome the opportunity to discuss how my skills can support your team.\n\nSincerely,\n\n${userData.name || 'Student'}`,
    };
  }

  return {
    prompt,
    markdown: `# ${userData.name || 'Student Name'}\n\n${userData.contact || 'Contact'}${userData.linkedin ? ` | ${userData.linkedin}` : ''}\n\n## Professional Summary\nFinal-year university student with practical experience in ${skills}. Strong ability to learn quickly, write clearly, and deliver structured academic and technical work.\n\n## Education\n**${userData.degree || 'Degree'}**, ${userData.university || 'University'}\n\nCGPA: ${userData.cgpa || 'N/A'}\n\n## Skills\n${skills.split(',').map((skill) => `- ${skill.trim()}`).join('\n')}\n\n## Projects\n${projects.split('\n').filter(Boolean).map((project) => `- ${project.trim()}`).join('\n') || '- Add notable university projects here.'}\n\n## ATS Notes\n- Use role-specific keywords from the job description.\n- Quantify impact where possible.\n- Keep formatting simple for applicant tracking systems.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'career_docs');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Resume/Cover Letter') }, { status: 429 });

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
    if (!userData.name || !userData.degree) return NextResponse.json({ status: 'error', error: 'Name aur degree zaroori hain.' }, { status: 400 });

    const result = await generateCareerDocs(userData, jobDescription, type);
    return NextResponse.json({ status: 'success', data: result });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Career document generate nahi ho saka.' }, { status: 500 });
  }
}
