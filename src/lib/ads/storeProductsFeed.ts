// Powers the 'store_products' ad placement — <HouseAdBanner slot="store_products"> shows live
// ilmai.store products with zero manual setup: no admin has to create/upload a banner for a new
// product, it just starts rotating in automatically the moment it's published on the store, and
// stops the moment it's unpublished. No sync job, no local copy of the image — this fetches the
// store's own public catalog fresh (briefly cached) on every request, so the image URL (a signed
// B2 URL that itself expires after 24h — see the store's StorageService.getProductMediaUrl) is
// always resolved live rather than ever going stale in a local table.

type StoreProduct = {
  id: string;
  slug: string;
  title: string;
  media: { url: string; isPrimary: boolean; mediaType: string }[];
};

export type StoreProductBanner = { id: string; title: string; imageUrl: string; clickHref: string };

export async function getStoreProductBanners(limit = 8): Promise<StoreProductBanner[]> {
  const storeUrl = process.env.STORE_URL || 'https://ilmai.store';
  try {
    const response = await fetch(
      `${storeUrl}/api/products?sort=newest&pageSize=${Math.min(20, Math.max(1, limit))}`,
      { next: { revalidate: 300 } } // 5 min — fresh enough for a new product to show up quickly,
      // without hitting the store on every single ad-banner render across ilmai.study.
    );
    if (!response.ok) return [];
    const json = (await response.json()) as { items?: StoreProduct[] };
    const items = Array.isArray(json.items) ? json.items : [];

    return items
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
