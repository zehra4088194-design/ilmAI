// ============================================
// AI GATEWAY CLIENT
// Talks to the Cloudflare Worker (cloudflare-worker/worker.js) instead of
// calling Groq/Claude/GPT/Gemini directly. The Worker holds all API keys
// (5 per provider) and handles rotation + automatic Groq fallback.
//
// IMPORTANT: this file must only ever run on the SERVER (API routes,
// Server Components). Never import it in a 'use client' file — that would
// leak AI_GATEWAY_URL/SECRET to the browser.
// ============================================
import type { ChatMessage } from '@/types';

export type AiProviderId = 'groq' | 'claude' | 'gpt' | 'gemini';
export type ModelTier = 'mini' | 'medium' | 'pro';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://studyverse-ai1.noorhusnain791.workers.dev';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';

export interface GatewayChatRequest {
  provider: AiProviderId;
  tier: ModelTier;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface GatewayChatResponse {
  text: string;
  providerUsed: AiProviderId;
  modelUsed: string;
  fallbackTriggered?: boolean;
  originalProvider?: AiProviderId;
  error?: string;
}

async function gatewayFetch(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify(body),
    // Gateway does its own multi-key retries; give it room to work
    signal: AbortSignal.timeout(45000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Gateway request failed (${res.status})`);
  return data;
}

/** Send a chat completion through the gateway. Non-streaming by design — see docs for why. */
export async function gatewayChat({ provider, tier, messages, maxTokens = 2048, temperature = 0.7 }: GatewayChatRequest): Promise<GatewayChatResponse> {
  return gatewayFetch('/chat', { provider, tier, messages, max_tokens: maxTokens, temperature });
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
    ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
  const result = await gatewayChat({ provider, tier, messages: formatted });
  return result.text;
}

function buildSystemPrompt(subject?: string): string {
  const base = `You are StudyVerse AI, an expert tutor for Pakistani students (Grades 9-12, O/A Levels).
You specialize in FBISE and provincial board curricula.
- Explain concepts clearly, mixing in Roman Urdu phrases naturally when helpful
- For MCQs, explain why each option is correct or incorrect
- Encourage and motivate students
- Be concise but thorough`;
  return subject ? `${base}\n\nCurrent subject: ${subject}.` : base;
}

export async function generateQuizViaGateway(params: { subjectId: string; chapterIds: string[]; count: number; difficulty?: string; provider?: AiProviderId; tier?: ModelTier }): Promise<string> {
  const prompt = `Generate ${params.count} MCQ questions for Pakistani board exam students.
Difficulty: ${params.difficulty || 'MEDIUM'}
Return ONLY valid JSON array: [{"text":"...","options":[{"id":"a","text":"..."}],"correctAnswer":"a","explanation":"...","difficulty":"MEDIUM","marks":1}]`;
  const result = await gatewayChat({
    provider: params.provider || 'groq',
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

export async function explainConceptViaGateway(concept: string, subject: string, gradeLevel: string, provider: AiProviderId = 'groq', tier: ModelTier = 'mini'): Promise<string> {
  const result = await gatewayChat({
    provider, tier,
    messages: [
      { role: 'system', content: `Expert ${subject} tutor for Pakistani ${gradeLevel} students. Roman Urdu mixed with English where helpful.` },
      { role: 'user', content: `Explain this concept clearly: ${concept}. Use simple language, examples, and key points.` },
    ],
    maxTokens: 1024,
    temperature: 0.5,
  });
  return result.text;
}

export async function generateFlashcardsViaGateway(topic: string, subject: string, count = 10, provider: AiProviderId = 'groq', tier: ModelTier = 'mini'): Promise<string> {
  const result = await gatewayChat({
    provider, tier,
    messages: [
      { role: 'system', content: 'Expert flashcard creator for Pakistani board exams. Return only valid JSON array, no markdown fences.' },
      { role: 'user', content: `Create ${count} flashcards for "${topic}" in ${subject}.\nReturn: [{"front":"...","back":"...","hint":"..."}]` },
    ],
    maxTokens: 2048,
    temperature: 0.4,
  });
  return result.text;
}
