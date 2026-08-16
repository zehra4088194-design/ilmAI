/**
 * Single source of truth for which parts of the app require a live network
 * connection. Two consumers read this file and must never drift apart:
 *
 *  - next.config.ts (service-worker runtime-caching config, Node context)
 *  - src/components/features/offline/OnlineOnlyGate (in-app "you're offline"
 *    banner, browser context)
 *
 * This list is the EXHAUSTIVE set of exceptions from docs/OFFLINE_SUPPORT.md:
 * AI tutor chat/generation, live quiz/test-taking, vision/OCR, voice, live
 * (real-time) features, and payments/checkout. Anything not listed here is
 * expected to be offline-capable via the default NetworkFirst navigation
 * caching — do not add a route here just because it's convenient; only add
 * routes that genuinely cannot function without a live connection.
 *
 * Kept dependency-free (no framework imports) so it can be imported directly
 * from next.config.ts as well as from client components.
 */

/** API route prefixes that must always hit the network — never cached, never replayed offline. */
export const ONLINE_ONLY_API_PREFIXES = [
  // AI generation / tutoring
  '/api/ai/',
  '/api/doubts',
  '/api/career/generate',
  '/api/flashcards/generate',
  '/api/insights/roadmap',
  '/api/student-chat/messages',
  '/api/presentation/generate',
  '/api/teacher/tests/generate',
  '/api/admin/opportunities/suggest',
  // Vision / OCR / voice
  '/api/vision/',
  '/api/ocr',
  '/api/voice/',
  '/api/college-admin/attendance/scan',
  '/api/school-admin/attendance/scan',
  // Real-time / push / live session state
  '/api/push/',
  '/api/games/events',
  // Payments / checkout
  '/api/payments/',
  '/api/institution-plan-inquiry',
  // Auth / session mutation (can't work offline regardless, and must never be cached)
  '/api/auth/',
  // Anti-bot / security
  '/api/security/recaptcha',
  // Live external / per-request data that must never be served stale
  '/api/geo',
  '/api/pubchem/',
  '/api/media/',
  '/api/schools/search',
  '/api/school-admin/directory/search',
  // Write-path / ledger routes — never safe to replay from a cache
  '/api/credits',
  '/api/xp/award',
  '/api/quiz/complete',
  // Server-to-server only, never navigated to by the browser
  '/api/webhooks/',
  '/api/cron/',
] as const;

export function isOnlineOnlyApiPath(pathname: string) {
  return ONLINE_ONLY_API_PREFIXES.some((prefix) => {
    // A trailing-slash prefix ("/api/ai/") matches anything nested under it.
    // A bare-route prefix ("/api/geo") must match exactly or at a "/" boundary
    // — plain startsWith() would wrongly treat "/api/geolocation" as part of
    // "/api/geo".
    if (prefix.endsWith('/')) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/**
 * Page-level surfaces whose core interaction cannot work offline. The route
 * still loads its shell from the page-navigation cache when offline (so
 * users don't get a dead browser error page) — these entry points instead
 * show the OfflineNotice banner in place of the interactive feature.
 */
export const ONLINE_ONLY_PAGE_PREFIXES = [
  '/ai-tutor',
  '/student-chat',
  '/full-test',
  '/scan',
  '/tutor/speaking-practice',
  '/checkout',
] as const;

export function isOnlineOnlyPagePath(pathname: string) {
  return ONLINE_ONLY_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
