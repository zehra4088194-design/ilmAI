// ============================================
// AI GATEWAY CLIENT
// Talks to the private AI gateway instead of calling provider APIs directly.
// In production, Coolify runs that service on its private Docker network and
// keeps all provider keys outside the public web container.
//
// IMPORTANT: this file must only ever run on the SERVER (API routes,
// Server Components). Never import it in a 'use client' file — that would
// leak AI_GATEWAY_URL/SECRET to the browser.
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
  if (/^\s*\{\s*"?(?:error|message)"?\s*:/i.test(value) && /(?:error|failed|unavailable|rate.?limit)/i.test(value)) {
    return false;
  }
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
  const requestBody: any = body && typeof body === 'object' ? { ...(body as Record<string, unknown>) } : body;
  if (requestBody && typeof requestBody === 'object') {
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
    const rawMessage =
      typeof data === 'string' ? data : (data as { error?: string })?.error || `Gateway request failed (${res.status})`;
    const message =
      res.status === 401 || res.status === 403
        ? 'AI gateway authorization failed. GATEWAY_SECRET is missing or does not match the app AI_GATEWAY_SECRET.'
        : rawMessage;
    throw new GatewayError(message, res.status, data);
  }
  return data;
}

/**
 * Send a chat completion through the gateway.
 *
 * Provider routing is intentionally strict at this layer. The Next.js
 * application resolves the provider from the admin routing setting and this
 * function attempts that provider only. There is no hidden Gemini/DeepSeek
 * fallback here, even when an older caller omits strictProvider.
 */
export async function gatewayChat({
  provider,
  tier,
  messages,
  maxTokens = 2048,
  temperature = 0.7,
  strictProvider = true,
  routingPolicy = 'text',
  validateResponse,
}: GatewayChatRequest): Promise<GatewayChatResponse> {
  const attempt: GatewayChatRequest = {
    provider,
    tier,
    messages,
    maxTokens,
    temperature,
    strictProvider: true,
    routingPolicy,
    validateResponse,
  };

  try {
    const budgetKey = getProviderBudgetKey(attempt.provider, attempt.tier);
    if (budgetKey) {
      const budget = await checkProviderDailyLimit(budgetKey);
      if (!budget.success) {
        throw new GatewayError(`${attempt.provider} has reached its free daily budget.`, 429, {
          provider: attempt.provider,
          reset: budget.reset,
        });
      }
    }

    const data = (await gatewayFetch('/chat', {
      provider: attempt.provider === 'advanced' ? ADVANCED_GATEWAY_PROVIDER : attempt.provider,
      tier: attempt.tier,
      messages,
      max_tokens: maxTokens,
      temperature,
      strict_provider: true,
    })) as GatewayChatResponse;

    if (!isUsableAiResponse(data.text || '') || (validateResponse && !validateResponse(data.text))) {
      throw new GatewayError('AI provider returned an unusable response.', 502, data);
    }

    const rawProviderUsed = String(data.providerUsed || '');
    const rawOriginalProvider = data.originalProvider ? String(data.originalProvider) : undefined;
    const providerUsed = rawProviderUsed === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.providerUsed;
    const originalProvider = rawOriginalProvider === ADVANCED_GATEWAY_PROVIDER ? 'advanced' : data.originalProvider;
    return {
      ...data,
      providerUsed: providerUsed as AiProviderId,
      fallbackTriggered: false,
      originalProvider: originalProvider as AiProviderId | undefined,
    };
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError('The selected AI provider could not generate a response.', 502, error);
  }
}

/** Convenience wrapper matching the shape used by the old direct-SDK client. */
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
  const result = await gatewayChat({ provider, tier, messages: formatted, strictProvider: true });
  return result.text;
}

// Shared formatting instruction appended to every prompt whose output is
// rendered through <AiAnswerRenderer> as a structured "document" (headings,
// numbered steps, tables, LaTeX) rather than a flat paragraph of text.
export const MARKDOWN_ANSWER_FORMAT_INSTRUCTION = `Format your answer as a well-structured document using Markdown:
- Start with a short one-line heading or summary (use "### " for it)
- Break the explanation into clear steps or points — use numbered lists ("1. 2. 3.") for sequential/procedural steps and bullet points for non-sequential facts
- **Bold** key terms, formulas, and final answers
- Write any math using LaTeX with dollar-sign delimiters ONLY: inline as $x^2$ and standalone equations (including matrices, \begin{aligned}, etc.) as $$E = mc^2$$. NEVER use \( \) or \[ \] — the renderer does not recognize them and the raw LaTeX source will show up as broken plain text instead of a formula
- Never place an entire math or physics solution in one paragraph or one line
- For every numerical, use these short sections in order: **Given**, **Find**, **Formula**, **Substitution**, **Working**, and **Final Answer**
- Put each important calculation on its own display-math line, preserve units at every step, and box the result as $$\\boxed{answer\\;unit}$$
- For proofs or algebra, show one transformation per line and briefly state why that step is valid
- If data is missing or units are inconsistent, point it out before calculating instead of guessing
- Whenever a question has ONE definitive final answer — not just a math/physics numerical, but also a balanced chemical equation, a genetics cross result, a named structure/process, an MCQ's correct option, a short factual answer — end with a line starting EXACTLY with "**Final Answer:**" followed by that answer alone, concise, on that one line (wrap it in $$\\boxed{...}$$ only when it's a formula/equation/number; plain bold text is fine otherwise). The app highlights this exact line, so never use "Final Answer" as a label for anything else, and skip this entirely for open-ended/discussion questions with no single answer
- Use a short code block for any code
- Use a Markdown table (GFM syntax) whenever you present a data set, comparison, truth table, or any array of values — never describe a table's rows in prose
- To draw a graph (a plotted function, a bar/comparison chart, a scatter plot, or a pie chart), output a fenced code block with language "chart" (the fence must say exactly \`\`\`chart, never \`\`\`json or plain \`\`\`) containing ONLY a JSON object matching this schema — it renders as a real chart, not text:
  \`\`\`chart
  {"type":"line","title":"y = x^2","xLabel":"x","yLabel":"y","series":[{"name":"x^2","fn":"x^2","xMin":-10,"xMax":10,"steps":40}]}
  \`\`\`
  - "type" is one of "line", "bar", "scatter", "pie"
  - For a mathematical function, ALWAYS use "fn" (a plain math expression in terms of x, e.g. "x^2", "sin(x)", "2*x+3") with "xMin"/"xMax"/steps" — it is evaluated exactly, so never hand-compute and list out the (x, y) points yourself
  - For anything else (comparisons, survey results, bar/pie data), use "data": an array of {"x":...,"y":...} points instead of "fn" — every point needs a real number, never a placeholder like "<value>"
  - "series" can have more than one entry to plot multiple functions/datasets on the same chart
  - Only emit a chart block when a visual actually helps (a real function, a comparison, a distribution) AND you are confident in the actual numbers. If real-world data (e.g. a country's GDP by year) isn't reliably known to you, say so in plain text and suggest where to find it — do NOT invent numbers and do NOT output a code block of placeholders/blanks for the student to fill in
- Keep paragraphs short (2-3 sentences max) — favor structure over long prose`;

function buildSystemPrompt(subject?: string): string {
  const base = `You are ilm AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels).
You specialize in FBISE and provincial board curricula.
- Explain concepts clearly in professional English. Use Roman Urdu only when the student explicitly requests it.
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
    provider: params.provider || 'gemini',
    tier: params.tier || 'medium',
    messages: [
      {
        role: 'system',
        content: 'You are an expert question generator for Pakistani board exams. Return only valid JSON, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 4096,
    temperature: 0.3,
    strictProvider: true,
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
      {
        role: 'system',
        content: `Expert ${subject} tutor for Pakistani ${gradeLevel} students. Respond in professional English by default; use Roman Urdu only when explicitly requested.\n\n${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
      },
      {
        role: 'user',
        content: `Explain this concept clearly: ${concept}. Use simple language, examples, and key points.`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.5,
    strictProvider: true,
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
      {
        role: 'system',
        content: 'Expert flashcard creator for Pakistani board exams. Return only valid JSON array, no markdown fences.',
      },
      {
        role: 'user',
        content: `Create ${count} flashcards for "${topic}" in ${subject}.\nReturn: [{"front":"...","back":"...","hint":"..."}]`,
      },
    ],
    maxTokens: 2048,
    temperature: 0.4,
    strictProvider: true,
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
  const prompt = `List the ${count} core curriculum concepts (SLOs) taught in the chapter "${params.chapterName}" of ${params.subjectName} for ${boardLine}, ${gradeLine}.
Order them the way a student should learn them (foundational concepts first).
For any concept that depends on another concept in this same list, list that concept's exact title in "prerequisite_titles".
Return ONLY valid JSON array: [{"slo_code":"...","title":"...","description":"...","difficulty":"easy|medium|hard","order_index":0,"prerequisite_titles":["..."]}]`;
  const result = await gatewayChat({
    provider: params.provider || 'gemini',
    tier: params.tier || 'medium',
    messages: [
      {
        role: 'system',
        content: 'You are a curriculum designer for Pakistani board exams. Return only valid JSON array, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 4096,
    temperature: 0.3,
    strictProvider: true,
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
  const prompt = `Concepts (id: title):\n${conceptList}\n\nQuestions (id: text):\n${questionList}\n\nFor each question, pick the single best-matching concept id from the list above, or null if none genuinely fit.\nReturn ONLY valid JSON array: [{"questionId":"...","conceptId":"..."|null}]`;
  const result = await gatewayChat({
    provider: params.provider || 'gemini',
    tier: params.tier || 'mini',
    messages: [
      {
        role: 'system',
        content: 'You classify exam questions against a curriculum concept list. Return only valid JSON array, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 2048,
    temperature: 0.1,
    strictProvider: true,
  });
  return result.text;
}

// ============================================
// LIVE VOICE CALL
// The gateway mints a short-lived, single-use ephemeral Gemini token with
// the AI Teacher persona locked in server-side. The browser then connects
// directly to Gemini Live using that token; the raw Gemini key never leaves
// the private gateway, and audio never flows through our own servers.
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
