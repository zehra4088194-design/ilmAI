// Calls ilmai.store's internal product-sync endpoint so a library resource gets a matching
// printed-copy product there (created on first order, price kept in sync on every later one) —
// see that endpoint's own comment (src/app/api/internal/notes-product/route.ts in the store repo)
// and NOTES_PRODUCT_SYNC_SECRET, which must be the exact same value on both deployments.

export type NotesProductSyncResult = { id: string; slug: string; url: string };

export async function syncNotesProduct(input: {
  resourceId: string;
  title: string;
  priceMinor: number;
  pageCount: number;
  // Which of the resource's PDF theme versions actually exist — the student picks one on the
  // store's product page as a variant (see the store's syncNotesProduct). At least one must be
  // true; if only one is, there's nothing to choose and the store creates a single variant.
  hasLightVersion: boolean;
  hasDarkVersion: boolean;
  // Auto-generated cover (see lib/library/studyCoverSvg.ts) — raw SVG markup, uploaded as-is as
  // the product's primary image. Generated fresh here (not on the store) so the design lives in
  // one place; the store just stores whatever bytes it's handed.
  coverSvg: string;
}): Promise<NotesProductSyncResult> {
  const storeUrl = process.env.STORE_URL || 'https://ilmai.store';
  const secret = process.env.NOTES_PRODUCT_SYNC_SECRET;
  if (!secret) throw new Error('NOTES_PRODUCT_SYNC_SECRET is not configured.');

  const response = await fetch(`${storeUrl}/api/internal/notes-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error || 'The store could not create this product.');
  return json as NotesProductSyncResult;
}
