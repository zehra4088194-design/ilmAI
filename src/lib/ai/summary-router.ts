import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';

export const SHORT_SUMMARY_CHAR_LIMIT = 6000;

export function chooseSummaryModel(text: string): {
  provider: AiProviderId;
  tier: ModelTier;
  maxInputChars: number;
  reason: string;
} {
  return {
    provider: 'local',
    tier: 'mini',
    maxInputChars: Math.max(SHORT_SUMMARY_CHAR_LIMIT, 12_000),
    reason: text.length <= SHORT_SUMMARY_CHAR_LIMIT ? 'short_text_local' : 'long_text_local_bounded',
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
  const clippedText = buildRepresentativeTextContext(text, model.maxInputChars);
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
    provider: result.providerUsed,
    tier: model.tier,
    routeReason: model.reason,
  };
}
