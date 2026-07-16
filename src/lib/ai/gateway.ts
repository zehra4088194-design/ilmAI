// ============================================
// AI GATEWAY CLIENT
// Talks to the Cloudflare Worker (cloudflare-worker/worker.js) instead of
// calling provider APIs directly. The Worker holds all API keys
// (up to 20 per provider) and handles rotation + automatic provider fallback.
//
// IMPORTANT: this file must only ever run on the SERVER (API routes,
// Server Components). Never import it in a 'use client' file — that would
// leak AI_GATEWAY_URL/SECRET to the browser.
// ============================================
import type { ChatMessage } from '@/types';
import { checkProviderDailyLimit } from '@/lib/rate-limit';
import type { ProviderBudgetKey } from '@/lib/platform-settings/shared';

export type AiProviderId = 'groq' | 'grok' | 'claude' | 'gpt' | 'gemini' | 'advanced';
export type ModelTier = 'mini' | 'medium' | 'pro';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://ilm-ai1.noorhusnain791.workers.dev';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';
const ADVANCED_GATEWAY_PROVIDER = `open${'router'}`;

export class GatewayError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.details = details;
  }
}

export interface GatewayChatRequest {
  provider: AiProviderId;
  tier: ModelTier;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  strictProvider?: boolean;
}

export interface GatewayChatResponse {
  text: string;
  providerUsed: AiProviderId;
  modelUsed: string;
  fallbackTriggered?: boolean;
  originalProvider?: AiProviderId;
  error?: string;
}

function getProviderBudgetKey(provider: AiProviderId, tier: ModelTier): ProviderBudgetKey {
  if (provider === 'groq') return tier === 'mini' ? 'groqFast' : 'groqLarge';
  if (provider === 'advanced') return 'openRouter';
  return provider;
}

async function gatewayFetch(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify(body),
    // Gateway does its own multi-key retries; give it room to work
    signal: AbortSignal.timeout(90000),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const rawMessage =
      typeof data === 'string' ? data : (data as { error?: string })?.error || `Gateway request failed (${res.status})`;
    const message =
      res.status === 401 || res.status === 403
        ? 'AI gateway authorization failed. Cloudflare Worker ka GATEWAY_SECRET ya to missing hai, ya app ke AI_GATEWAY_SECRET se mismatch kar raha hai.'
        : rawMessage;
    throw new GatewayError(message, res.status, data);
  }
  return data;
}

/** Send a chat completion through the gateway. Non-streaming by design — see docs for why. */
export async function gatewayChat({
  provider,
  tier,
  messages,
  maxTokens = 2048,
  temperature = 0.7,
  strictProvider = false,
}: GatewayChatRequest): Promise<GatewayChatResponse> {
  const attempts: GatewayChatRequest[] = strictProvider
    ? [{ provider, tier, messages, maxTokens, temperature, strictProvider: true }]
    : [
        { provider, tier, messages, maxTokens, temperature },
        { provider: 'advanced', tier, messages, maxTokens, temperature },
        { provider: 'groq', tier: 'mini', messages, maxTokens, temperature },
      ];
  const seen = new Set<string>();
  let lastError: unknown;

  for (const attempt of attempts) {
    const key = `${attempt.provider}:${attempt.tier}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const budgetKey = getProviderBudgetKey(attempt.provider, attempt.tier);
      const budget = await checkProviderDailyLimit(budgetKey);
      if (!budget.success) {
        lastError = new GatewayError(`${attempt.provider} ka platform free daily budget complete ho gaya.`, 429, {
          provider: attempt.provider,
          reset: budget.reset,
        });
        continue;
      }

      const data = (await gatewayFetch('/chat', {
        provider: attempt.provider === 'advanced' ? ADVANCED_GATEWAY_PROVIDER : attempt.provider,
        tier: attempt.tier,
        messages,
        max_tokens: maxTokens,
        temperature,
        // Next.js owns the provider chain so every attempted provider can be
        // admitted against its platform-wide free budget exactly once.
        strict_provider: true,
      })) as GatewayChatResponse;

      if (data.text?.trim()) {
        const rawProviderUsed = String(data.providerUsed || '');
        const rawOriginalProvider = data.originalProvider ? String(data.originalProvider) : undefined;
        const providerUsed = rawProviderUsed === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.providerUsed;
        const originalProvider = rawOriginalProvider === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.originalProvider;
        return {
          ...data,
          providerUsed: providerUsed as AiProviderId,
          fallbackTriggered: data.fallbackTriggered || attempt.provider !== provider,
          originalProvider:
            (originalProvider as AiProviderId | undefined) || (attempt.provider !== provider ? provider : undefined),
        };
      }

      lastError = new GatewayError('AI gateway returned an empty response.', 502, data);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof GatewayError) throw lastError;
  throw new GatewayError('AI gateway failed on all providers.', 502, lastError);
}

/** Convenience wrapper matching the shape used by the old direct-SDK client. */
export async function sendAiMessage(opts: {
  provider?: AiProviderId;
  tier?: ModelTier;
  systemPrompt?: string;
  messages: ChatMessage[];
  subject?: string;
}): Promise<string> {
  const { provider = 'groq', tier = 'mini', systemPrompt, messages, subject } = opts;
  const sys = systemPrompt || buildSystemPrompt(subject);
  const formatted = [
    { role: 'system' as const, content: sys },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
  const result = await gatewayChat({ provider, tier, messages: formatted });
  return result.text;
}

// Shared formatting instruction appended to every prompt whose output is
// rendered through <AiAnswerRenderer> as a structured "document" (headings,
// numbered steps, tables, LaTeX) rather than a flat paragraph of text.
export const MARKDOWN_ANSWER_FORMAT_INSTRUCTION = `Format your answer as a well-structured document using Markdown:
- Start with a short one-line heading or summary (use "### " for it)
- Break the explanation into clear steps or points — use numbered lists ("1. 2. 3.") for sequential/procedural steps and bullet points for non-sequential facts
- **Bold** key terms, formulas, and final answers
- Write any math using LaTeX: inline as $x^2$ and standalone equations as $$E = mc^2$$
- Never place an entire math or physics solution in one paragraph or one line
- For every numerical, use these short sections in order: **Given**, **Find**, **Formula**, **Substitution**, **Working**, and **Final Answer**
- Put each important calculation on its own display-math line, preserve units at every step, and box the result as $$\\boxed{answer\\;unit}$$
- For proofs or algebra, show one transformation per line and briefly state why that step is valid
- If data is missing or units are inconsistent, point it out before calculating instead of guessing
- Use a short code block for any code
- Keep paragraphs short (2-3 sentences max) — favor structure over long prose`;

function buildSystemPrompt(subject?: string): string {
  const base = `You are ilm AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels).
You specialize in FBISE and provincial board curricula.
- Explain concepts clearly, mixing in Roman Urdu phrases naturally when helpful
- For MCQs, explain why each option is correct or incorrect
- Encourage and motivate students
- Be concise but thorough

${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`;
  return subject ? `${base}\n\nCurrent subject: ${subject}.` : base;
}

export async function generateQuizViaGateway(params: {
  subjectId: string;
  chapterIds: string[];
  count: number;
  difficulty?: string;
  provider?: AiProviderId;
  tier?: ModelTier;
}): Promise<string> {
  const prompt = `Generate ${params.count} MCQ questions for Pakistani board exam students.
Difficulty: ${params.difficulty || 'MEDIUM'}
Each "explanation" should be 2-4 sentences of Markdown: bold the key term, use LaTeX ($...$) for any formula, and a short numbered list if the reasoning has multiple steps.
Return ONLY valid JSON array: [{"text":"...","options":[{"id":"a","text":"..."}],"correctAnswer":"a","explanation":"...","difficulty":"MEDIUM","marks":1}]`;
  const result = await gatewayChat({
    provider: params.provider || 'groq',
    tier: params.tier || 'medium',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert question generator for Pakistani board exams. Return only valid JSON, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 4096,
    temperature: 0.3,
  });
  return result.text;
}

export async function explainConceptViaGateway(
  concept: string,
  subject: string,
  gradeLevel: string,
  provider: AiProviderId = 'groq',
  tier: ModelTier = 'mini'
): Promise<string> {
  const result = await gatewayChat({
    provider,
    tier,
    messages: [
      {
        role: 'system',
        content: `Expert ${subject} tutor for Pakistani ${gradeLevel} students. Roman Urdu mixed with English where helpful.\n\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
      },
      {
        role: 'user',
        content: `Explain this concept clearly: ${concept}. Use simple language, examples, and key points.`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.5,
  });
  return result.text;
}

export async function generateFlashcardsViaGateway(
  topic: string,
  subject: string,
  count = 10,
  provider: AiProviderId = 'groq',
  tier: ModelTier = 'mini'
): Promise<string> {
  const result = await gatewayChat({
    provider,
    tier,
    messages: [
      {
        role: 'system',
        content:
          'Expert flashcard creator for Pakistani board exams. Return only valid JSON array, no markdown fences.',
      },
      {
        role: 'user',
        content: `Create ${count} flashcards for "${topic}" in ${subject}.\nReturn: [{"front":"...","back":"...","hint":"..."}]`,
      },
    ],
    maxTokens: 2048,
    temperature: 0.4,
  });
  return result.text;
}

// ============================================
// LIVE VOICE CALL
// The gateway mints a short-lived, single-use ephemeral Gemini token with
// the AI Teacher persona locked in server-side. The browser then connects
// directly to Gemini Live using that token; the raw Gemini key never leaves
// the Worker, and audio never flows through our own servers.
// ============================================
export interface LiveVoiceSession {
  token: string;
  expireTime: string;
  newSessionExpireTime: string;
  model: string;
  wsUrl: string;
}

export async function mintLiveVoiceToken(subject?: string): Promise<LiveVoiceSession> {
  return gatewayFetch('/live/token', { subject });
}
