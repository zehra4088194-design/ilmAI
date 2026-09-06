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
 * - PRO: no ad gate. May use their own saved institution/teacher name and logo as the paper's
 *   header mark (auto-applied — see initialInstitutionName/initialLogoUrl in TeacherTestStudio) —
 *   but ilm AI still credits itself (as a small side mark, not the header logo, once a custom logo
 *   is set — see HeaderBrandMark in TestPaper.tsx) and cannot be fully hidden.
 * - ELITE: everything PRO gets, plus the option to hide the ilm AI mark entirely.
 */
export function resolveTestBranding(tier: PlanTier, elite: EliteBrandingInput = {}): ResolvedBranding {
  if (tier === 'PRO' || tier === 'ELITE') {
    // Only ELITE may fully remove ilm AI's own credit from the paper.
    const hidePlatformBranding = tier === 'ELITE' && Boolean(elite.hidePlatformBranding);
    return {
      forceIlmAiWatermark: !hidePlatformBranding,
      requiresAdGate: false,
      customHeader: clean(elite.customHeader, HEADER_MAX),
      customWatermarkText: clean(elite.customWatermarkText, WATERMARK_TEXT_MAX),
      customWatermarkImageUrl: safeUrl(elite.customWatermarkImageUrl),
      hidePlatformBranding,
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
