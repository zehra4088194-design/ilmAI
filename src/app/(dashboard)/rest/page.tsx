import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RestClient } from '@/components/features/rest/RestClient';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Rest & Relaxing Sounds' };

export default async function RestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user!.id).maybeSingle();
  const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);

  const { data: playlists } = await (supabase.from('music_playlists' as any) as any)
    .select('id, name, slug, description, cover_image_url, is_pro, order_index, playlist_songs(id, title, artist, youtube_video_id, thumbnail_url, order_index, is_active)')
    .order('order_index', { ascending: true });

  return <RestClient playlists={(playlists || []) as any} tier={tier} canUseRest={plan.access.restPlaylists} />;
}
