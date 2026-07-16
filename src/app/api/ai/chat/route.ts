import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError, type AiProviderId, type ModelTier, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import { checkAiMessageLimit, checkAiSideChatLimit, checkModelTierLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

function buildSystemPrompt(subject?: string, source?: string) {
  const navigationCatalog = `
App navigation (use only these exact internal links when the student asks where a feature is):
- Dashboard: /dashboard
- Subjects and chapters: /study
- Lectures: /lectures
- Library books and notes: /library
- Past papers: /past-papers
- AI Tutor: /ai-tutor
- AI Testing: /practice
- Full Test: /full-test
- Guess Paper: /guess-paper
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
  const sideChatRules = source === 'side_chat'
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
- Explain concepts clearly, step by step
- Mix English with Roman Urdu phrases naturally when it helps understanding
- For MCQs: explain why each option is right/wrong
- For math/physics: show full working
- Be encouraging and patient
${sideChatRules}

${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Login required hai' }), { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const userTier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const { message, history = [], provider: requestedProvider, tier: requestedTier, subject, source } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message required hai' }), { status: 400 });
    }

    // FREE tier is hard-locked to the default Assistant, no matter what the client sends
    const provider: AiProviderId = userTier === 'FREE' ? 'groq' : (requestedProvider || 'groq');
    const tier: ModelTier = requestedTier || 'mini';
    if (tier === 'pro' && userTier !== 'ELITE') {
      return new Response(JSON.stringify({ error: 'Pro model tier sirf Elite users ke liye hai. Elite upgrade karo ya mini/medium use karo.' }), { status: 403 });
    }

    // Quota check: the default Assistant uses the daily AI-message pool; other providers use the
    // mini/medium/pro tiered pool (10/7/3 per day) since they cost real money per call.
    if (provider === 'groq') {
      const isSideChat = source === 'side_chat';
      const limitCheck = isSideChat
        ? await checkAiSideChatLimit(user.id, userTier)
        : await checkAiMessageLimit(user.id, userTier, 'ai_tutor');
      if (!limitCheck.success) {
        return new Response(JSON.stringify({ error: await getConfiguredLimitExceededMessage(userTier, isSideChat ? 'Side chat' : 'AI Tutor') }), { status: 429 });
      }
    } else {
      if (userTier === 'FREE') {
        return new Response(JSON.stringify({ error: 'Ye AI model sirf Pro/Elite users ke liye hai. Free plan mein Assistant available hai.' }), { status: 403 });
      }
      const tierCheck = await checkModelTierLimit(user.id, provider, tier, userTier);
      if (!tierCheck.success) {
        return new Response(JSON.stringify({ error: `Is model (${tier}) ki aaj ki limit khatam ho gayi. Kal phir try karo ya doosra model select karo.` }), { status: 429 });
      }
    }

    const messages = [
      { role: 'system' as const, content: buildSystemPrompt(typeof subject === 'string' ? subject : undefined, source) },
      ...history.filter((m: { role: string; content: string }) => m.content).map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const result = await gatewayChat({ provider, tier, messages, maxTokens: source === 'side_chat' ? 1100 : 2048, temperature: 0.7 });

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
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Provider-Used': result.providerUsed,
        'X-Fallback-Triggered': String(result.fallbackTriggered || false),
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    if (error instanceof GatewayError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status === 401 || error.status === 403 ? 502 : 500 });
    }
    return new Response(JSON.stringify({ error: 'AI response generate nahi ho saka. Dobara try karo.' }), { status: 500 });
  }
}
