import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  gatewayChat,
  GatewayError,
  type AiProviderId,
  type ModelTier,
  MARKDOWN_ANSWER_FORMAT_INSTRUCTION,
} from '@/lib/ai/gateway';
import {
  checkAiMessageLimit,
  checkAiSideChatLimit,
  consumeAiCredits,
  getConfiguredLimitExceededMessage,
} from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';
import { getLocalSmallTalkResponse, shouldUseLocalSmallTalk } from '@/lib/ai/request-routing';
import { buildSubjectTutorContext } from '@/lib/resources/subject-tutor-context';

export const runtime = 'nodejs';
export const maxDuration = 30;

function buildSystemPrompt(subject?: string, source?: string, subjectContext?: string | null) {
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
  const sideChatRules =
    source === 'side_chat'
      ? `
Side chat mode:
- Do not start with a generic welcome or self-introduction
- Answer the student's exact question directly
- Keep it compact unless the student asks for detail
- If the message is just "hi/hello", greet warmly in one short line and ask what subject they need help with
${navigationCatalog}`
      : '';
  return `You are ilm AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels, FBISE & provincial boards).${subject ? `\nThe student has chosen to focus this session on: ${subject}. Keep your answers scoped to that subject unless they explicitly ask about something else.` : ''}
Rules:
- Use a Socratic tutoring style. Do not dump the final answer first unless the student explicitly asks for "final answer only".
- For learning questions, structure the response as: Quick idea, Hint, Next step, Worked example, Final check question.
- Identify the likely misconception if the student's attempt is wrong or incomplete.
- Ask one short check question at the end so the student practices the next step.
- Respond in professional English by default. Use Roman Urdu only when the student explicitly requests it.
- For MCQs: explain why each option is right/wrong
- For math/physics numericals: show readable formulas, substitutions, units, and final answer on separate lines
- If the question is navigation/help about the app, answer directly and include the relevant link instead of tutoring steps
${sideChatRules}
${subjectContext ? `
Subject-specific source context:
- Use the context below as the first source for subject questions.
- If the answer is not present in this context, say what is missing and then give a general explanation.
- Do not claim "according to uploaded file"; answer naturally.

${subjectContext}` : ''}

${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Login is required.' }), { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const userTier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const { message, history = [], provider: requestedProvider, subject, subjectId, source } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'A message is required.' }), { status: 400 });
    }

    const localSmallTalk = shouldUseLocalSmallTalk(message);
    if (localSmallTalk) {
      const encoder = new TextEncoder();
      const text = getLocalSmallTalkResponse(message, user.id);
      const readableStream = new ReadableStream({
        async start(controller) {
          const chunkSize = 4;
          for (let i = 0; i < text.length; i += chunkSize) {
            controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
            await new Promise((r) => setTimeout(r, 8));
          }
          controller.close();
        },
      });
      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Provider-Used': 'local',
          'X-Fallback-Triggered': 'false',
        },
      });
    }

    const requested = typeof requestedProvider === 'string' ? requestedProvider : 'groq';
    const assistantSelected = requested === 'groq' || requested === 'assistant';
    const provider: AiProviderId = assistantSelected ? 'local' : 'deepseek';
    const tier: ModelTier = 'mini';

    const isSideChat = source === 'side_chat';
    const limitCheck = isSideChat
      ? await checkAiSideChatLimit(user.id, userTier)
      : await checkAiMessageLimit(user.id, userTier, 'ai_tutor');
    if (!limitCheck.success) {
      return new Response(
        JSON.stringify({
          error: await getConfiguredLimitExceededMessage(userTier, isSideChat ? 'Side chat' : 'AI Tutor'),
        }),
        { status: 429 }
      );
    }

    const subjectContext =
      source === 'ai_tutor'
        ? await buildSubjectTutorContext({
            subjectId: typeof subjectId === 'string' ? subjectId : null,
            subjectName: typeof subject === 'string' ? subject : null,
            query: message,
          }).catch((error) => {
            console.warn('Subject tutor context unavailable:', error);
            return null;
          })
        : null;

    const messages = [
      {
        role: 'system' as const,
        content: buildSystemPrompt(typeof subject === 'string' ? subject : undefined, source, subjectContext),
      },
      ...history
        .filter((m: { role: string; content: string }) => m.content)
        .map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    let result;
    if (source === 'ai_tutor' && assistantSelected && subjectContext) {
      try {
        result = await gatewayChat({
          provider: 'local',
          tier,
          messages,
          maxTokens: 1600,
          temperature: 0.55,
          strictProvider: true,
          routingPolicy: 'local',
        });
      } catch (localError) {
        console.warn('Local subject tutor unavailable; falling back to DeepSeek lite:', localError);
      }
    }
    result ||= await gatewayChat({
      provider: provider === 'local' ? 'deepseek' : provider,
      tier,
      messages,
      maxTokens: source === 'side_chat' ? 1100 : 2048,
      temperature: 0.7,
      strictProvider: true,
      routingPolicy: 'text',
    });

    // Simulate a stream so the existing chat UI (which reads response.body as a stream)
    // keeps its "typing" experience, even though the gateway itself is non-streaming
    // (necessary for safe key-rotation — see docs for why).
    const encoder = new TextEncoder();
    const text = result.text;
    const readableStream = new ReadableStream({
      async start(controller) {
        const chunkSize = 4;
        for (let i = 0; i < text.length; i += chunkSize) {
          controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
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
        'X-Fallback-Triggered': String(result.fallbackTriggered || (Boolean(requestedProvider) && result.providerUsed !== requestedProvider)),
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    if (error instanceof GatewayError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status === 401 || error.status === 403 ? 502 : 500,
      });
    }
    return new Response(JSON.stringify({ error: 'The AI response could not be generated. Please try again.' }), {
      status: 500,
    });
  }
}
