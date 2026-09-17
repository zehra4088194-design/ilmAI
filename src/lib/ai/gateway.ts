// ============================================
// AI GATEWAY CLIENT
// Talks to the private AI gateway instead of calling provider APIs directly.
// This file must only run on the server.
// ============================================
import type { ChatMessage } from '@/types';
import { checkProviderDailyLimit } from '@/lib/rate-limit';
import type { ProviderBudgetKey } from '@/lib/platform-settings/shared';
import { getAiRuntimeSettings } from '@/lib/ai/runtime-settings';

export type AiProviderId = 'local' | 'groq' | 'grok' | 'claude' | 'gpt' | 'gemini' | 'deepseek' | 'advanced';
export type ModelTier = 'mini' | 'medium' | 'pro';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:8787';
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
  routingPolicy?: 'text' | 'tutor' | 'presentation' | 'grading' | 'gemini' | 'local';
  validateResponse?: (text: string) => boolean;
}

export interface GatewayChatResponse {
  text: string;
  providerUsed: AiProviderId;
  modelUsed: string;
  fallbackTriggered?: boolean;
  originalProvider?: AiProviderId;
  error?: string;
}

export function isUsableAiResponse(text: string): boolean {
  const value = text.trim();
  if (value.length < 2 || !/[\p{L}\p{N}]/u.test(value)) return false;
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(value)) return false;
  if (/^\s*\{\s*"?(?:error|message)"?\s*:/i.test(value) && /(?:error|failed|unavailable|rate.?limit)/i.test(value)) return false;
  if (/^(?:error|service unavailable|bad gateway|gateway timeout|internal server error)\b/i.test(value)) return false;
  return true;
}

function getProviderBudgetKey(provider: AiProviderId, tier: ModelTier): ProviderBudgetKey | null {
  if (provider === 'local') return null;
  if (provider === 'groq') return tier === 'mini' ? 'groqFast' : 'groqLarge';
  if (provider === 'deepseek') return 'deepseek';
  if (provider === 'advanced') return 'openRouter';
  return provider;
}

async function gatewayFetch(path: string, body: unknown) {
  const provider = typeof body === 'object' && body ? String((body as { provider?: unknown }).provider || '') : '';
  const requestBody: Record<string, unknown> = body && typeof body === 'object' ? { ...(body as Record<string, unknown>) } : {};
  if (requestBody && provider) {
    const runtime = await getAiRuntimeSettings();
    const selectedProvider = provider === ADVANCED_GATEWAY_PROVIDER ? 'openrouter' : provider;
    if (selectedProvider === 'groq' || selectedProvider === 'gemini' || selectedProvider === 'openrouter') {
      const selection = runtime[selectedProvider];
      requestBody.key_mode = selection.mode;
      requestBody.key_number = selection.keyNumber;
    }
  }

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(provider === 'local' ? 185000 : 90000),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const rawMessage = typeof data === 'string' ? data : (data as { error?: string })?.error || `Gateway request failed (${res.status})`;
    const message = res.status === 401 || res.status === 403
      ? 'AI gateway authorization failed. GATEWAY_SECRET is missing or does not match the app AI_GATEWAY_SECRET.'
      : rawMessage;
    throw new GatewayError(message, res.status, data);
  }
  return data;
}

// The admin-selected provider is always attempted first. Fallbacks are only
// used after that provider has completely failed or returned an unusable answer.
const FALLBACK_PROVIDERS: Record<AiProviderId, AiProviderId[]> = {
  local: ['groq', 'gemini', 'deepseek', 'advanced'],
  groq: ['gemini', 'deepseek', 'advanced'],
  gemini: ['deepseek', 'groq', 'advanced'],
  deepseek: ['groq', 'gemini', 'advanced'],
  advanced: ['groq', 'gemini', 'deepseek'],
  grok: ['claude', 'gpt', 'groq', 'gemini', 'deepseek', 'advanced'],
  claude: ['gpt', 'grok', 'groq', 'gemini', 'deepseek', 'advanced'],
  gpt: ['claude', 'grok', 'groq', 'gemini', 'deepseek', 'advanced'],
};

/**
 * Sends to the selected provider first, then follows the platform fallback
 * chain only when the previous provider fails. The gateway service itself is
 * always called with strict_provider=true, so it cannot introduce a second
 * hidden fallback behind the application's explicit order.
 *
 * `strictProvider` remains accepted for backwards compatibility with older
 * routes. Platform-level fallback is intentionally available even for callers
 * that still pass strictProvider:true; the flag no longer disables the safety
 * fallback chain.
 */
export async function gatewayChat({
  provider,
  tier,
  messages,
  maxTokens = 2048,
  temperature = 0.7,
  strictProvider: _strictProvider = false,
  routingPolicy = 'text',
  validateResponse,
}: GatewayChatRequest): Promise<GatewayChatResponse> {
  const providerChain = [provider, ...(FALLBACK_PROVIDERS[provider] || [])];
  const seen = new Set<AiProviderId>();
  let lastError: unknown;

  for (const attemptProvider of providerChain) {
    if (seen.has(attemptProvider)) continue;
    seen.add(attemptProvider);

    try {
      const budgetKey = getProviderBudgetKey(attemptProvider, tier);
      if (budgetKey) {
        const budget = await checkProviderDailyLimit(budgetKey);
        if (!budget.success) {
          lastError = new GatewayError(`${attemptProvider} has reached its free daily budget.`, 429, {
            provider: attemptProvider,
            reset: budget.reset,
          });
          continue;
        }
      }

      const data = (await gatewayFetch('/chat', {
        provider: attemptProvider === 'advanced' ? ADVANCED_GATEWAY_PROVIDER : attemptProvider,
        tier: attemptProvider === 'local' ? 'mini' : tier,
        messages,
        max_tokens: maxTokens,
        temperature,
        strict_provider: true,
      })) as GatewayChatResponse;

      if (!isUsableAiResponse(data.text || '') || (validateResponse && !validateResponse(data.text))) {
        lastError = new GatewayError(`${attemptProvider} returned an unusable AI response.`, 502, data);
        continue;
      }

      const rawProviderUsed = String(data.providerUsed || '');
      const rawOriginalProvider = data.originalProvider ? String(data.originalProvider) : undefined;
      const providerUsed = rawProviderUsed === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.providerUsed;
      const originalProvider = rawOriginalProvider === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.originalProvider;
      const fallbackTriggered = attemptProvider !== provider;

      return {
        ...data,
        providerUsed: providerUsed as AiProviderId,
        fallbackTriggered,
        originalProvider: (originalProvider as AiProviderId | undefined) || (fallbackTriggered ? provider : undefined),
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof GatewayError) throw lastError;
  throw new GatewayError('AI gateway failed on all configured providers.', 502, lastError);
}

export async function sendAiMessage(opts: {
  provider?: AiProviderId;
  tier?: ModelTier;
  systemPrompt?: string;
  messages: ChatMessage[];
  subject?: string;
}): Promise<string> {
  const { provider = 'gemini', tier = 'mini', systemPrompt, messages, subject } = opts;
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

export const MARKDOWN_ANSWER_FORMAT_INSTRUCTION = `Format your answer as a well-structured Markdown document:
- Start with a short one-line heading or summary using "### ".
- Use numbered steps for procedures and bullets for non-sequential facts.
- **Bold** key terms, formulas, and final answers.
- Use LaTeX with dollar-sign delimiters only: inline $x^2$ and display $$E=mc^2$$. Never use \\( \\) or \\[ \\].
- For numericals use: **Given**, **Find**, **Formula**, **Substitution**, **Working**, **Final Answer**.
- Keep important calculations on separate lines and preserve units.
- For proofs or algebra, show one transformation per line and briefly state why it is valid.
- If data is missing or units are inconsistent, say so instead of guessing.
- For a question with one definitive answer, end with a line starting exactly **Final Answer:** followed by the concise answer. Do not use that label for open-ended questions.
- Use short code blocks for code and Markdown tables for datasets/comparisons.
- For graphs, use a fenced \\`\\`\\`chart block containing only the chart JSON schema already supported by the app.
- Keep paragraphs short.`;

function buildSystemPrompt(subject?: string): string {
  const base = `You are ilm AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels).
You specialize in FBISE and provincial board curricula.
- Explain concepts clearly in professional English by default. Use Roman Urdu only when explicitly requested.
- For MCQs, explain why each option is correct or incorrect.
- Be concise but thorough.

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
  const prompt = `Generate ${params.count} MCQ questions for Pakistani board exam students.\nDifficulty: ${params.difficulty || 'MEDIUM'}\nReturn ONLY valid JSON array: [{"text":"...","options":[{"id":"a","text":"..."}],"correctAnswer":"a","explanation":"...","difficulty":"MEDIUM","marks":1}]`;
  const result = await gatewayChat({
    provider: params.provider || 'gemini',
    tier: params.tier || 'medium',
    messages: [
      { role: 'system', content: 'You are an expert question generator for Pakistani board exams. Return only valid JSON, no markdown fences.' },
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
  provider: AiProviderId = 'gemini',
  tier: ModelTier = 'mini'
): Promise<string> {
  const result = await gatewayChat({
    provider,
    tier,
    messages: [
      { role: 'system', content: `Expert ${subject} tutor for Pakistani ${gradeLevel} students. Respond in professional English by default; use Roman Urdu only when explicitly requested.\n\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}` },
      { role: 'user', content: `Explain this concept clearly: ${concept}. Use simple language, examples, and key points.` },
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
  provider: AiProviderId = 'gemini',
  tier: ModelTier = 'mini'
): Promise<string> {
  const result = await gatewayChat({
    provider,
    tier,
    messages: [
      { role: 'system', content: 'Expert flashcard creator for Pakistani board exams. Return only valid JSON array, no markdown fences.' },
      { role: 'user', content: `Create ${count} flashcards for "${topic}" in ${subject}.\nReturn: [{"front":"...","back":"...","hint":"..."}]` },
    ],
    maxTokens: 2048,
    temperature: 0.4,
  });
  return result.text;
}

export async function generateConceptsForChapterViaGateway(params: {
  chapterName: string;
  subjectName: string;
  boards?: string[];
  gradeLevel?: string | null;
  count?: number;
  provider?: AiProviderId;
  tier?: ModelTier;
}): Promise<string> {
  const count = params.count || 8;
  const boardLine = params.boards?.length ? params.boards.join(', ') : 'Pakistani boards';
  const gradeLine = params.gradeLevel || 'the relevant grade';
  const prompt = `List the ${count} core curriculum concepts (SLOs) taught in the chapter "${params.chapterName}" of ${params.subjectName} for ${boardLine}, ${gradeLine}.\nOrder them the way a student should learn them (foundational concepts first).\nFor any concept that depends on another concept in this same list, list that concept's exact title in "prerequisite_titles".\nReturn ONLY valid JSON array: [{"slo_code":"...","title":"...","description":"...","difficulty":"easy|medium|hard","order_index":0,"prerequisite_titles":["..."]}]`;
  const result = await gatewayChat({
    provider: params.provider || 'gemini',
    tier: params.tier || 'medium',
    messages: [
      { role: 'system', content: 'You are a curriculum designer for Pakistani board exams. Return only valid JSON array, no markdown fences.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 4096,
    temperature: 0.3,
  });
  return result.text;
}

export async function tagQuestionsWithConceptsViaGateway(params: {
  concepts: { id: string; title: string }[];
  questions: { id: string; text: string }[];
  provider?: AiProviderId;
  tier?: ModelTier;
}): Promise<string> {
  const conceptList = params.concepts.map((c) => `${c.id}: ${c.title}`).join('\n');
  const questionList = params.questions.map((q) => `${q.id}: ${q.text.slice(0, 300)}`).join('\n');
  const result = await gatewayChat({
    provider: params.provider || 'gemini',
    tier: params.tier || 'mini',
    messages: [
      { role: 'system', content: 'You classify exam questions against a curriculum concept list. Return only valid JSON array, no markdown fences.' },
      { role: 'user', content: `Concepts (id: title):\n${conceptList}\n\nQuestions (id: text):\n${questionList}\n\nFor each question, pick the single best-matching concept id from the list above, or null if none genuinely fit.\nReturn ONLY valid JSON array: [{"questionId":"...","conceptId":"..."|null}]` },
    ],
    maxTokens: 2048,
    temperature: 0.1,
  });
  return result.text;
}

export interface LiveVoiceSession {
  token: string;
  expireTime: string;
  newSessionExpireTime: string;
  model: string;
  wsUrl: string;
}

export async function mintLiveVoiceToken(subject?: string): Promise<LiveVoiceSession> {
  return gatewayFetch('/live/token', { subject }) as Promise<LiveVoiceSession>;
}
