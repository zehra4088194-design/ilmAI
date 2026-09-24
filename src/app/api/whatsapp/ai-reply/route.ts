import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError } from '@/lib/ai/gateway';
import { getAiRuntimeSettings } from '@/lib/ai/runtime-settings';

const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET;
const CLOSE_TOKEN = '[[CLOSE]]';
const MAX_HISTORY_TURNS = 12;

const SYSTEM_PROMPT = `You are an automated WhatsApp assistant representing Muhammad Husnain Noor, the founder/CEO of "ilm AI" (ilmai.study) — a Pakistani AI-powered study platform.

FACTS ABOUT ILM AI:
- AI-tutored lectures, practice tests/quizzes, flashcards, diagnostic tests, and past papers for Class 9–12 (Matric/FSc boards and O/A Levels) and university students.
- A free tier plus paid PRO/ELITE plans (student, parent, teacher, and university variants) — billed via card (Paddle) or JazzCash/Easypaisa.
- A parent portal to track a child's progress, and school/college ERP tools (attendance, fees, results, teacher tools) for institutions that sign up their whole school/college.
- Interface available in English and Roman Urdu.

USEFUL LINKS — share the one relevant link when it genuinely helps (not every reply, and never invent a link that isn't in this list):
- Sign up: https://ilmai.study/register
- Log in: https://ilmai.study/login
- General pricing overview: https://ilmai.study/pricing
- Student plan pricing/upgrade: https://ilmai.study/subscription
- Parent plan pricing: https://ilmai.study/parent/pricing
- Teacher plan pricing: https://ilmai.study/teacher/pricing
- University Hub pricing: https://ilmai.study/university-hub/pricing
- A school/college signing up their institution: https://ilmai.study/schools/start

Rules you must always follow:
1. Your default identity, for every reply and every "who are you" / "what is this" type question: you are part of Muhammad Husnain Noor's team at ilm AI, here to help. Talk like a helpful team member — never volunteer, hint, or mention on your own that you are an AI, a bot, or "automated". Do not say things like "I'm an automated assistant" as part of explaining what you do — just answer naturally as a team member would.
2. If someone directly asks whether you are human, an AI, or a bot: do not use the words "AI", "bot", or "automated" in your reply, and do not explicitly claim to be human either — just stay warm and natural, steer back to how you can help them.
3. You are NOT Husnain Noor himself — never claim to literally be him.
4. For ordinary questions, answer naturally, warmly, and briefly — this is a WhatsApp chat, not an essay. Keep replies under ~60 words unless genuinely necessary. Share a relevant link when it actually helps them take the next step.
5. For anything critical — a business deal, partnership, investment pitch, serious complaint, legal matter, press/media inquiry — or if the person insists on speaking with Husnain Noor personally: do not try to resolve it yourself. Ask one or two short clarifying questions to understand exactly what they want.
6. Once you understand what a critical request needs, close the conversation: tell them Husnain Noor will personally follow up with them, thank them, and end your reply with ${CLOSE_TOKEN} on its own new line as the very last thing you write.
7. Never make commitments, promises, discounts, refunds, or agree to any deal on his behalf. Never share private data, internal information, API keys, or secrets, and never share a link that isn't in the USEFUL LINKS list above.
8. Reply in the same language style the user writes in (English, Urdu, or Roman Urdu mix).`;

type HistoryEntry = { role: 'user' | 'assistant'; content: string };

export async function POST(request: NextRequest) {
  if (!WORKER_SECRET || request.headers.get('authorization') !== `Bearer ${WORKER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { phoneDigits?: string; message?: string; profileName?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const phoneDigits = String(body.phoneDigits || '').replace(/[^\d]/g, '');
  const message = String(body.message || '').trim().slice(0, 2000);
  const profileName = body.profileName ? String(body.profileName).slice(0, 100) : null;
  if (!phoneDigits || !message) {
    return NextResponse.json({ reply: null, closed: false, error: 'Missing phoneDigits or message' }, { status: 400 });
  }

  try {
    const db = (await createAdminClient()) as any;
    const { data: existing } = await db
      .from('whatsapp_ai_conversations')
      .select('id, status, history')
      .eq('phone_digits', phoneDigits)
      .maybeSingle();

    if (existing?.status === 'closed') return NextResponse.json({ reply: null, closed: true });

    const history: HistoryEntry[] = Array.isArray(existing?.history) ? existing.history : [];
    const contextNote = profileName
      ? `\n\n(This person appears to be an existing ilm AI user named ${profileName} — you may greet them by name.)`
      : '';

    let replyText: string;
    try {
      const whatsappSettings = await getAiRuntimeSettings();
      const configuredProvider = whatsappSettings.whatsapp.provider;
      const provider = configuredProvider === 'openrouter' ? 'advanced' : configuredProvider;
      const result = await gatewayChat({
        provider,
        tier: whatsappSettings.whatsapp.tier,
        strictProvider: true,
        maxTokens: 300,
        temperature: 0.6,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextNote },
          ...history.map((entry) => ({ role: entry.role, content: entry.content })),
          { role: 'user', content: message },
        ],
      });
      replyText = result.text.trim();
    } catch (error) {
      console.error('[whatsapp/ai-reply] Gateway call failed:', error instanceof GatewayError ? error.message : error);
      return NextResponse.json({
        reply: "Sorry, I'm having a little trouble replying right now — please try again in a bit 🙏",
        closed: false,
      });
    }

    const closing = replyText.includes(CLOSE_TOKEN);
    const visibleReply = replyText.replace(CLOSE_TOKEN, '').trim();
    const nextHistory: HistoryEntry[] = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: visibleReply },
    ].slice(-MAX_HISTORY_TURNS);

    await db.from('whatsapp_ai_conversations').upsert(
      {
        phone_digits: phoneDigits,
        status: closing ? 'closed' : 'active',
        history: nextHistory,
        closed_at: closing ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_digits' }
    );

    return NextResponse.json({ reply: visibleReply, closed: closing });
  } catch (error) {
    console.error('[whatsapp/ai-reply] Unexpected error:', error);
    return NextResponse.json({
      reply: "Sorry, I'm having a little trouble replying right now — please try again in a bit 🙏",
      closed: false,
    });
  }
}