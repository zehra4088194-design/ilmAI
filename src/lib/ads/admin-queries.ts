import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { listAllBanners, type AdBanner } from './queries';

export type BannerStats = {
  banner: AdBanner;
  impressions: number;
  clicks: number;
  conversions: number;
  orderValueTotal: number;
  conversionRate: number;
};

/**
 * One rollup pass over every banner: two queries total (impressions, clicks), aggregated in
 * memory — not one query per banner — so the admin dashboard never N+1s as the banner count grows.
 */
export async function listBannersWithStats(range?: { from?: string; to?: string }): Promise<BannerStats[]> {
  const banners = await listAllBanners();
  if (!banners.length) return [];

  const supabase = createServiceClient();
  const bannerIds = banners.map((banner) => banner.id);

  let impressionsQuery = supabase
    .from('ad_impressions_daily')
    .select('banner_id, impression_count')
    .in('banner_id', bannerIds);
  if (range?.from) impressionsQuery = impressionsQuery.gte('date', range.from);
  if (range?.to) impressionsQuery = impressionsQuery.lte('date', range.to);

  let clicksQuery = supabase.from('ad_clicks').select('banner_id, converted, order_value').in('banner_id', bannerIds);
  if (range?.from) clicksQuery = clicksQuery.gte('clicked_at', `${range.from}T00:00:00.000Z`);
  if (range?.to) clicksQuery = clicksQuery.lte('clicked_at', `${range.to}T23:59:59.999Z`);

  const [{ data: impressionRows }, { data: clickRows }] = await Promise.all([impressionsQuery, clicksQuery]);

  const impressionsByBanner = new Map<string, number>();
  for (const row of (impressionRows || []) as { banner_id: string; impression_count: number }[]) {
    impressionsByBanner.set(row.banner_id, (impressionsByBanner.get(row.banner_id) || 0) + row.impression_count);
  }

  const clicksByBanner = new Map<string, { clicks: number; conversions: number; orderValueTotal: number }>();
  for (const row of (clickRows || []) as { banner_id: string; converted: boolean; order_value: number | null }[]) {
    const entry = clicksByBanner.get(row.banner_id) || { clicks: 0, conversions: 0, orderValueTotal: 0 };
    entry.clicks += 1;
    if (row.converted) {
      entry.conversions += 1;
      entry.orderValueTotal += Number(row.order_value) || 0;
    }
    clicksByBanner.set(row.banner_id, entry);
  }

  return banners.map((banner) => {
    const clickStats = clicksByBanner.get(banner.id) || { clicks: 0, conversions: 0, orderValueTotal: 0 };
    const impressions = impressionsByBanner.get(banner.id) || 0;
    return {
      banner,
      impressions,
      clicks: clickStats.clicks,
      conversions: clickStats.conversions,
      orderValueTotal: clickStats.orderValueTotal,
      conversionRate: clickStats.clicks > 0 ? clickStats.conversions / clickStats.clicks : 0,
    };
  });
}
