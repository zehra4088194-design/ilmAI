import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';

export const GROQ_SUMMARY_CHAR_LIMIT = 6000;

export function chooseSummaryModel(text: string): { provider: AiProviderId; tier: ModelTier; maxInputChars: number; reason: string } {
  if (text.length <= GROQ_SUMMARY_CHAR_LIMIT) {
    return {
      provider: 'groq',
      tier: 'mini',
      maxInputChars: GROQ_SUMMARY_CHAR_LIMIT,
      reason: 'short_text_groq',
    };
  }

  return {
    provider: 'gemini',
    tier: 'pro',
    maxInputChars: 50000,
    reason: 'long_text_gemini',
  };
}

export async function summarizeWithRoutedModel({
  text,
  system,
  prompt,
  maxTokens = 1400,
  temperature = 0.3,
}: {
  text: string;
  system: string;
  prompt: (text: string) => string;
  maxTokens?: number;
  temperature?: number;
}) {
  const model = chooseSummaryModel(text);
  const clippedText = text.slice(0, model.maxInputChars);
  const result = await gatewayChat({
    provider: model.provider,
    tier: model.tier,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt(clippedText) },
    ],
    maxTokens,
    temperature,
  });

  return {
    text: result.text,
    provider: model.provider,
    tier: model.tier,
    routeReason: model.reason,
  };
}
