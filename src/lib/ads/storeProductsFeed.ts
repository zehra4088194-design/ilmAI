// Powers the 'store_products' ad placement — <HouseAdBanner slot="store_products"> shows live
// ilmai.store products with zero manual setup: no admin has to create/upload a banner for a new
// product, it just starts rotating in automatically the moment it's published on the store, and
// stops the moment it's unpublished. No sync job, no local copy of the image — this fetches the
// store's own public catalog fresh (briefly cached) on every request, so the image URL (a signed
// B2 URL that itself expires after 24h — see the store's StorageService.getProductMediaUrl) is
// always resolved live rather than ever going stale in a local table.

type StoreAdTargeting = { audience?: 'student' | 'parent' | 'teacher' | 'principal'; category?: string; gradeLevel?: string };

type StoreProduct = {
  id: string;
  slug: string;
  title: string;
  media: { url: string; isPrimary: boolean; mediaType: string }[];
  adTargeting?: StoreAdTargeting;
};

export type StoreProductBanner = { id: string; title: string; imageUrl: string; clickHref: string };

// Same targeting rules as an admin-created ad_banners row (target_audience + categories) — see
// selectActiveBanners in lib/ads/queries.ts — just read off the store product's adTargeting
// instead of a local table row, so a product set to e.g. "Students only, Chemistry" on the store
// only ever shows on an ilmai.study page that both matches the viewer's role AND passed
// categoryContext="Chemistry" (or "gradeLevel" — one categoryContext slot covers either, exactly
// like the store's own product form lets an admin fill in either field for the same reason).
function matchesViewer(product: StoreProduct, audience: string | null, category: string | null): boolean {
  const targeting = product.adTargeting;
  if (!targeting) return true;
  if (targeting.audience && targeting.audience !== audience) return false;
  const scopes = [targeting.category, targeting.gradeLevel].filter(Boolean).map((s) => s!.trim().toLowerCase());
  if (!scopes.length) return true;
  if (!category) return false;
  return scopes.includes(category.trim().toLowerCase());
}

export async function getStoreProductBanners(
  audience: string | null,
  category: string | null,
  limit = 8
): Promise<StoreProductBanner[]> {
  const storeUrl = process.env.STORE_URL || 'https://ilmai.store';
  try {
    // Over-fetch — matchesViewer filters this pool down client-side (the store's public catalog
    // endpoint has no notion of ilmai.study's ad-targeting fields to filter server-side by).
    const response = await fetch(`${storeUrl}/api/products?sort=newest&pageSize=20`, {
      next: { revalidate: 300 }, // 5 min — fresh enough for a new product to show up quickly,
      // without hitting the store on every single ad-banner render across ilmai.study.
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { items?: StoreProduct[] };
    const items = Array.isArray(json.items) ? json.items : [];

    return items
      .filter((product) => matchesViewer(product, audience, category))
      .slice(0, Math.min(20, Math.max(1, limit)))
      .map((product) => {
        const image = product.media.find((m) => m.isPrimary) || product.media[0];
        if (!image?.url) return null;
        return {
          id: product.id,
          title: product.title,
          imageUrl: image.url,
          clickHref: `${storeUrl}/store/${product.slug}`,
        };
      })
      .filter((banner): banner is StoreProductBanner => Boolean(banner));
  } catch {
    // The store being briefly unreachable should never break a page that just wanted to show an
    // ad slot — <HouseAdBanner> already renders nothing when the banner list comes back empty.
    return [];
  }
}
