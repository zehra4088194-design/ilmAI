// Branding rules for the Teacher Test Studio, kept pure/testable so the
// FREE/PRO/ELITE behaviour described in the product spec can't drift
// silently. The API route and the client component both read from this.

export type PlanTier = 'FREE' | 'PRO' | 'ELITE';

export type EliteBrandingInput = {
  customHeader?: string | null;
  customWatermarkText?: string | null;
  customWatermarkImageUrl?: string | null;
  hidePlatformBranding?: boolean;
};

export type ResolvedBranding = {
  /** Whether the "ilm AI" watermark/footer must be shown regardless of teacher preference. */
  forceIlmAiWatermark: boolean;
  /** Whether a house ad must be acknowledged before generating (FREE only). */
  requiresAdGate: boolean;
  /** Header line shown under the ilm AI logo (school/teacher line), if any. */
  customHeader: string | null;
  /** Extra watermark text layered on the paper (ELITE only). */
  customWatermarkText: string | null;
  /** Extra watermark image URL layered on the paper (ELITE only). */
  customWatermarkImageUrl: string | null;
  /** True only when ELITE explicitly asked to hide the ilm AI mark and is allowed to. */
  hidePlatformBranding: boolean;
};

const HEADER_MAX = 120;
const WATERMARK_TEXT_MAX = 60;

function clean(value: string | null | undefined, max: number): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function safeUrl(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return trimmed.slice(0, 2048);
  } catch {
    return null;
  }
}

/**
 * Resolves what a paper is allowed to show, given the teacher's plan.
 * - FREE: ad-gated, ilm AI watermark always forced on, no custom branding.
 * - PRO: no ad gate, ilm AI watermark still shown (clean, no forced ad), no custom branding.
 * - ELITE: may add a custom header/watermark and may hide the ilm AI mark.
 */
export function resolveTestBranding(tier: PlanTier, elite: EliteBrandingInput = {}): ResolvedBranding {
  if (tier === 'ELITE') {
    const hidePlatformBranding = Boolean(elite.hidePlatformBranding);
    return {
      forceIlmAiWatermark: !hidePlatformBranding,
      requiresAdGate: false,
      customHeader: clean(elite.customHeader, HEADER_MAX),
      customWatermarkText: clean(elite.customWatermarkText, WATERMARK_TEXT_MAX),
      customWatermarkImageUrl: safeUrl(elite.customWatermarkImageUrl),
      hidePlatformBranding,
    };
  }

  if (tier === 'PRO') {
    return {
      forceIlmAiWatermark: true,
      requiresAdGate: false,
      customHeader: null,
      customWatermarkText: null,
      customWatermarkImageUrl: null,
      hidePlatformBranding: false,
    };
  }

  // FREE
  return {
    forceIlmAiWatermark: true,
    requiresAdGate: true,
    customHeader: null,
    customWatermarkText: null,
    customWatermarkImageUrl: null,
    hidePlatformBranding: false,
  };
}
