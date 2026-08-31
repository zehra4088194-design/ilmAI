import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { AdPlacement, AdTargetAudience } from './constants';

export type AdBanner = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  categories: string[];
  targetAudience: AdTargetAudience | null;
  weight: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdCategory = { id: string; name: string };

type BannerRow = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  placement: string;
  categories: string[] | null;
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
    categories: row.categories || [],
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

// Admin-managed vocabulary (subjects like Chemistry/Biology, plus general ones like Stationery) —
// selectable, not free-typed, from both the admin and seller banner forms.
export async function listCategories(): Promise<AdCategory[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('ad_categories').select('id, name').order('name', { ascending: true });
  if (error || !data) return [];
  return data as AdCategory[];
}

// A row per placement the admin has explicitly disabled; a placement with no row is enabled by
// default (matches "put it everywhere, I'll turn specific pages off from the admin panel").
export async function isPlacementEnabled(placement: AdPlacement): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('ad_placement_settings')
    .select('is_enabled')
    .eq('placement', placement)
    .maybeSingle();
  return data ? data.is_enabled !== false : true;
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

async function fetchEligibleBanners(placement: AdPlacement, audience: string | null): Promise<AdBanner[]> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('ad_banners')
    .select('*')
    .eq('placement', placement)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

  if (error || !data) return [];
  return (data as BannerRow[])
    .map(toBanner)
    .filter((banner) => !banner.targetAudience || banner.targetAudience === audience);
}

/**
 * Picks one active, in-window banner for a slot, optionally scoped to the viewer's role.
 * `audience` is the viewer's own role ('student' | 'parent' | ... ) or null for a guest —
 * a banner matches when its target_audience is null (everyone) or equals the viewer's role.
 */
export async function selectActiveBanner(placement: AdPlacement, audience: string | null): Promise<AdBanner | null> {
  return pickWeighted(await fetchEligibleBanners(placement, audience));
}

const MAX_ROTATION_BANNERS = 8;
const MAX_WEIGHT_REPEATS = 5;
// "4-5 ads should load" — if category-matched banners don't reach this many distinct banners,
// top the rotation up with any other eligible banner for the slot rather than leaving it short.
const TARGET_MIN_DISTINCT = 5;

// Fisher-Yates — used once to randomize the rotation's play order (weight already skews which
// banners appear more often via the repeat-by-weight step below; this just avoids always playing
// them back in insertion order).
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

function buildRotation(banners: AdBanner[]): AdBanner[] {
  return shuffle(banners.flatMap((banner) => Array(Math.min(banner.weight, MAX_WEIGHT_REPEATS)).fill(banner)));
}

/**
 * Builds the rotation sequence for the <HouseAdBanner> carousel: every eligible, in-window banner
 * for the slot, each repeated proportionally to its `weight` (capped) so a weight-3 banner is seen
 * roughly 3x as often as a weight-1 one across a full rotation, then shuffled once for play order.
 *
 * `categoryContext` (e.g. a subject name like "Chemistry" on a subject-scoped page) PREFERS
 * banners tagged with that category, but never restricts to only them — if fewer than
 * TARGET_MIN_DISTINCT distinct banners match, the rotation is topped up with any other eligible
 * banner for the slot so the carousel still has a full set to rotate through.
 */
export async function selectActiveBanners(
  placement: AdPlacement,
  audience: string | null,
  categoryContext?: string | null
): Promise<AdBanner[]> {
  const eligible = await fetchEligibleBanners(placement, audience);
  if (!eligible.length) return [];

  if (!categoryContext) return buildRotation(eligible).slice(0, MAX_ROTATION_BANNERS);

  const needle = categoryContext.trim().toLowerCase();
  const matched = eligible.filter((banner) => banner.categories.some((c) => c.toLowerCase() === needle));
  if (matched.length >= TARGET_MIN_DISTINCT || matched.length === eligible.length) {
    return buildRotation(matched).slice(0, MAX_ROTATION_BANNERS);
  }

  // Top up with the remaining (non-matched) banners, most-matched-first — matched banners still
  // dominate the rotation via their own weight repeats; the fallback ones just fill the gap.
  const matchedIds = new Set(matched.map((b) => b.id));
  const fallback = eligible.filter((banner) => !matchedIds.has(banner.id));
  const rotation = [...buildRotation(matched), ...buildRotation(fallback)];
  return rotation.slice(0, MAX_ROTATION_BANNERS);
}

// `createdBy` scopes to one owner's banners — used by the seller dashboard so a seller only ever
// sees/manages their own banners, never anyone else's or the platform's.
export async function listAllBanners(createdBy?: string): Promise<AdBanner[]> {
  const supabase = createServiceClient();
  let query = supabase.from('ad_banners').select('*').order('created_at', { ascending: false });
  if (createdBy) query = query.eq('created_by', createdBy);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as BannerRow[]).map(toBanner);
}
