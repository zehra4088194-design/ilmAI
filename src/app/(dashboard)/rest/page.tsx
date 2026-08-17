import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RestClient } from '@/components/features/rest/RestClient';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { getR2SignedUrl, parseR2Uri } from '@/lib/storage/r2';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Rest & Relaxing Sounds' };

export default async function RestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user!.id).maybeSingle();
  const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  const canUseRest = plan.access.restPlaylists;

  const { data: playlists } = await (supabase.from('music_playlists' as any) as any)
    .select(
      'id, name, slug, description, cover_image_url, is_pro, order_index, playlist_songs(id, title, artist, source_type, youtube_video_id, storage_url, duration_seconds, thumbnail_url, order_index, is_active)'
    )
    .order('order_index', { ascending: true });

  // Sign every uploaded-audio track's B2 key into a short-lived playback URL up front, server
  // side — the client never sees storage keys, only a URL that expires with the page's TTL
  // window. Only bother when the viewer can actually play the songs (free users hit a paywall
  // card instead), so signing never runs — or costs anything — for accounts that can't listen.
  const list = (playlists || []) as any[];
  if (canUseRest) {
    await Promise.all(
      list.flatMap((playlist) =>
        (playlist.playlist_songs || []).map(async (song: any) => {
          if (song.source_type !== 'audio' || !song.storage_url) return;
          const parsed = parseR2Uri(song.storage_url);
          if (!parsed) return;
          try {
            song.audio_url = await getR2SignedUrl(parsed.key, undefined, parsed.bucket);
          } catch {
            song.audio_url = null;
          }
        })
      )
    );
  }

  return <RestClient playlists={list as any} tier={tier} canUseRest={canUseRest} />;
}
