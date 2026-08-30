import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { AdPlacement, AdTargetAudience } from './constants';

export type AdBanner = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  targetAudience: AdTargetAudience | null;
  weight: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type BannerRow = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  placement: string;
  target_audience: string | null;
  weight: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function toBanner(row: BannerRow): AdBanner {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    placement: row.placement as AdPlacement,
    targetAudience: row.target_audience as AdTargetAudience | null,
    weight: row.weight,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Weighted random pick — a banner with weight 3 shows ~3x as often as one with weight 1.
function pickWeighted(banners: AdBanner[]): AdBanner | null {
  if (!banners.length) return null;
  const totalWeight = banners.reduce((sum, banner) => sum + banner.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const banner of banners) {
    roll -= banner.weight;
    if (roll <= 0) return banner;
  }
  return banners[banners.length - 1]!;
}

/**
 * Picks one active, in-window banner for a slot, optionally scoped to the viewer's role.
 * `audience` is the viewer's own role ('student' | 'parent' | ... ) or null for a guest —
 * a banner matches when its target_audience is null (everyone) or equals the viewer's role.
 */
export async function selectActiveBanner(placement: AdPlacement, audience: string | null): Promise<AdBanner | null> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('ad_banners')
    .select('*')
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

  if (error || !data) return null;

  const eligible = (data as BannerRow[])
    .map(toBanner)
    .filter((banner) => !banner.targetAudience || banner.targetAudience === audience);

  return pickWeighted(eligible);
}

export async function listAllBanners(): Promise<AdBanner[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('ad_banners').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as BannerRow[]).map(toBanner);
}
