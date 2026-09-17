import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  gatewayChat,
  GatewayError,
  type AiProviderId,
  type ModelTier,
  MARKDOWN_ANSWER_FORMAT_INSTRUCTION,
} from '@/lib/ai/gateway';
import { checkAiMessageLimit, checkAiSideChatLimit, consumeAiCredits, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';
import { buildSubjectTutorContext } from '@/lib/resources/subject-tutor-context';
import { buildSubjectResourceRagContext } from '@/lib/resources/subject-resource-rag';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';

export const runtime = 'nodejs';
export const maxDuration = 90;

function describeAsker(profile: { role?: string | null; grade_level?: string | null; education_level?: string | null }) {
  const gradeNumber = (value?: string | null) => { const match = value?.match(/(\d{1,2})/); return match ? match[1] : null; };
  if (profile.role === 'parent') return 'a parent';
  if (profile.role === 'teacher') return 'a teacher (or school/college staff member)';
  if (profile.role === 'admin') return 'a principal or institution admin';
  if (profile.education_level === 'university') return 'a university student';
  const grade = gradeNumber(profile.grade_level);
  if (profile.education_level === 'college' || (grade && Number(grade) >= 11)) return grade ? `a Grade ${grade} (intermediate/college) student` : 'an intermediate/college student';
  return grade ? `a Grade ${grade} student` : 'a student';
}

function buildSystemPrompt(subject?: string, source?: string, subjectContext?: string | null, askerContext?: { pageLabel?: string; asker?: string }) {
  const navigationCatalog = `
App navigation (use only these exact internal links when the student asks where a feature is):
- Dashboard: /dashboard
- Subjects and chapters: /study
- Lectures: /lectures
- Library books and notes: /library
- Past papers: /past-papers
- Pairing schemes: /library?type=pairing_scheme
- Uploaded guess papers: /library?type=guess_paper
- AI Tutor: /ai-tutor
- Adaptive Practice: /practice
- Full Test: /full-test
- AI Guess Paper generator: /guess-paper
- Scan and Solve: /scan
- Study Buddies: /student-chat
- Student Applications: /student-applications
- Application Inbox: /student-applications/inbox
- Parent Link: /settings?tab=parent-link
- Downloads: /downloads
- Subscription and plans: /subscription
- Settings: /settings
- Smart Planner: /planner/today
- Flashcards: /flashcards
- My Notes: /notes
- Progress: /progress
- University Hub: /university
When a destination is relevant, end with a short Markdown link such as [Open AI Tutor](/ai-tutor). Never invent an app route.`;
  const sideChatRules = source === 'side_chat' ? `
Side chat mode:
- Do not start with a generic welcome or self-introduction
- Answer the user's exact question directly
- Keep it compact unless the user asks for detail
- If the message is just "hi/hello", greet warmly in one short line and ask what subject they need help with
${askerContext?.asker || askerContext?.pageLabel ? `- You're talking to ${askerContext.asker || 'a user'}${askerContext.pageLabel ? `, currently on the "${askerContext.pageLabel}" page in the app` : ''} — tailor tone, depth, and examples accordingly. Don't just repeat this back to them.` : ''}
- For teachers/staff: focus on teaching workflows, lesson planning, worksheets, assessments, classroom explanations, and institution tools. Do not recommend textbook/book titles or display library-book search results unless the teacher explicitly asks for a book recommendation AND reliable book information is actually available. Never imply that a book exists in the app when you cannot verify it.
${navigationCatalog}` : '';
  return `You are ilm AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels, FBISE & provincial boards).${subject ? `\nThe student has chosen to focus this session on: ${subject}. Keep your answers scoped to that subject unless they explicitly ask about something else.` : ''}
Rules:
- Use a Socratic tutoring style. Do not dump the final answer first unless the student explicitly asks for "final answer only".
- For learning questions, structure the response as: Quick idea, Hint, Next step, Worked example, Final check question.
- Identify the likely misconception if the user's attempt is wrong or incomplete.
- Ask one short check question at the end so the user practices the next step.
- Respond in professional English by default. Use Roman Urdu only when the user explicitly requests it.
- For MCQs: explain why each option is right/wrong
- For math/physics numericals: show readable formulas, substitutions, units, and final answer on separate lines
- If the question is navigation/help about the app, answer directly and include the relevant link instead of tutoring steps
${sideChatRules}
${subjectContext ? `\nSubject-specific source context:\n- Use the context below as the first source for subject questions.\n- If the answer is not present in this context, say what is missing and then give a general explanation.\n- Do not claim "according to uploaded file"; answer naturally.\n\n${subjectContext}` : ''}
\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`;
}

function publicGatewayError(error: GatewayError) {
  if (error.status === 401 || error.status === 403) {
    return 'The AI service is not configured correctly right now. Please try again later.';
  }
  if (error.status === 429) {
    return 'The selected AI service has reached its current usage limit. Please try again later.';
  }
  if (error.status === 400) {
    return 'The AI request was invalid. Please shorten the question or try again.';
  }
  return 'The selected AI service is temporarily unavailable. Please try again.';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Login is required.' }), { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier, role, grade_level, education_level').eq('id', user.id).single();
    const userTier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const { message, history = [], subject, subjectId, source, pageLabel } = await req.json();
    if (!message || typeof message !== 'string') return new Response(JSON.stringify({ error: 'A message is required.' }), { status: 400 });

    const tier: ModelTier = 'mini';
    const isSideChat = source === 'side_chat';
    const limitCheck = isSideChat ? await checkAiSideChatLimit(user.id, userTier) : await checkAiMessageLimit(user.id, userTier, 'ai_tutor');
    if (!limitCheck.success) return new Response(JSON.stringify({ error: await getConfiguredLimitExceededMessage(userTier, isSideChat ? 'Side chat' : 'AI Tutor') }), { status: 429 });

    const resolvedSubjectId = typeof subjectId === 'string' ? subjectId : null;
    const [localKnowledgeContext, resourceRagContext] = source === 'ai_tutor' ? await Promise.all([
      buildSubjectTutorContext({ subjectId: resolvedSubjectId, subjectName: typeof subject === 'string' ? subject : null, query: message }).catch((error) => { console.warn('Subject tutor context unavailable:', error); return null; }),
      buildSubjectResourceRagContext({ subjectId: resolvedSubjectId, query: message }),
    ]) : [null, null];
    const subjectContext = [localKnowledgeContext, resourceRagContext].filter(Boolean).join('\n\n') || null;

    // The browser may send UI metadata, but provider selection is server-owned.
    // Never trust or honor a client-selected provider.
    const provider: AiProviderId = await resolveAiRoutingProvider(isSideChat ? 'sideChat' : 'aiTutor');
    const messages = [
      { role: 'system' as const, content: buildSystemPrompt(typeof subject === 'string' ? subject : undefined, source, subjectContext, { pageLabel: typeof pageLabel === 'string' ? pageLabel : undefined, asker: profile ? describeAsker(profile) : undefined }) },
      ...history.filter((m: { role: string; content: string }) => m.content).map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const result = await gatewayChat({
      provider,
      tier,
      messages,
      maxTokens: isSideChat ? 1100 : 2048,
      temperature: 0.7,
      strictProvider: true,
      routingPolicy: 'text',
    });

    const encoder = new TextEncoder();
    const text = result.text;
    const readableStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < text.length; i += 4) {
          controller.enqueue(encoder.encode(text.slice(i, i + 4)));
          await new Promise((r) => setTimeout(r, 8));
        }
        await consumeAiCredits(user.id, userTier, isSideChat ? 'side_chat' : 'ai_tutor');
        controller.close();
      },
    });
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Provider-Used': result.providerUsed,
        'X-Fallback-Triggered': 'false',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    if (error instanceof GatewayError) {
      return new Response(JSON.stringify({ error: publicGatewayError(error) }), { status: error.status >= 500 ? 502 : error.status });
    }
    return new Response(JSON.stringify({ error: 'The AI response could not be generated. Please try again.' }), { status: 500 });
  }
}