// Shared between the admin banner form, the API routes, and <HouseAdBanner>,
// so a placement typo can't silently produce a slot nothing ever fills.
export const AD_PLACEMENTS = [
  'content_inline',
  'teacher_test_gate',
  'dashboard_top',
  'quiz_results',
  'flashcards_top',
  'pdf_viewer',
  'test_taking',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  content_inline: 'Content pages (Library, Past Papers, Blog)',
  teacher_test_gate: 'Teacher Test Studio ad-gate',
  dashboard_top: 'Main dashboard (top)',
  quiz_results: 'Quiz / MCQ results screen',
  flashcards_top: 'Flashcards page (top)',
  pdf_viewer: 'PDF reader (footer strip)',
  test_taking: 'Per-file test-taking screen',
};

export const AD_TARGET_AUDIENCES = ['student', 'parent', 'teacher', 'principal', 'admin'] as const;
export type AdTargetAudience = (typeof AD_TARGET_AUDIENCES)[number];

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === 'string' && (AD_PLACEMENTS as readonly string[]).includes(value);
}
