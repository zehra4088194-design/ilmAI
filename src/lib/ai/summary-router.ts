import { gatewayChat, type ModelTier } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';

export const SHORT_SUMMARY_CHAR_LIMIT = 6000;

export function chooseSummaryModel(text: string): {
  tier: ModelTier;
  maxInputChars: number;
  reason: string;
} {
  return {
    tier: 'mini',
    maxInputChars: Math.max(SHORT_SUMMARY_CHAR_LIMIT, 12_000),
    reason: text.length <= SHORT_SUMMARY_CHAR_LIMIT ? 'short_text' : 'long_text_bounded',
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
  // Whichever provider /admin has selected for "Resource Summary" — this used to be hardcoded to
  // 'local' regardless of admin config (and since strictProvider wasn't set, the literal value was
  // silently ignored by the gateway's default fallback chain anyway).
  const provider = await resolveAiRoutingProvider('resourceSummary');
  const result = await gatewayChat({
    provider,
    tier: model.tier,
    strictProvider: true,
    routingPolicy: 'text',
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
