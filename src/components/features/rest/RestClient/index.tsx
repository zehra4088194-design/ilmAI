'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Brain, Crown, Headphones, Moon, Music2, SkipBack, SkipForward, Sparkles, Volume2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SubscriptionTier } from '@/types';

type Song = {
  id: string;
  title: string;
  artist: string | null;
  youtube_video_id: string;
  thumbnail_url: string | null;
  order_index: number;
};

type Playlist = {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  cover_image_url: string | null;
  is_pro: boolean;
  playlist_songs?: Song[];
};

const SAMPLE_PLAYLISTS: Playlist[] = [
  {
    id: 'sample-relax',
    name: 'Relax',
    description: 'Short calm break to reset your mind before studying again.',
    cover_image_url: null,
    is_pro: true,
    playlist_songs: [],
  },
  {
    id: 'sample-focus',
    name: 'Focus',
    description: 'Low distraction study background sounds.',
    cover_image_url: null,
    is_pro: true,
    playlist_songs: [],
  },
  {
    id: 'sample-sleep',
    name: 'Sleep',
    description: 'Gentle evening sounds to help your mind slow down.',
    cover_image_url: null,
    is_pro: true,
    playlist_songs: [],
  },
];

function getPlaylistArtwork(playlist: Playlist) {
  const firstSong = playlist.playlist_songs?.[0];
  return (
    playlist.cover_image_url ||
    firstSong?.thumbnail_url ||
    (firstSong?.youtube_video_id ? `https://img.youtube.com/vi/${firstSong.youtube_video_id}/hqdefault.jpg` : null)
  );
}

function PlaylistArtwork({
  playlist,
  source,
  compact = false,
}: {
  playlist: Playlist;
  source?: string | null;
  compact?: boolean;
}) {
  const artwork = source || getPlaylistArtwork(playlist);
  if (artwork) {
    return (
      <img
        src={artwork}
        alt={`${playlist.name} playlist cover`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  const identity = `${playlist.slug || ''} ${playlist.name}`.toLowerCase();
  const isSleep = identity.includes('sleep');
  const isFocus = identity.includes('focus');
  const Icon = isSleep ? Moon : isFocus ? Brain : Waves;
  const gradient = isSleep
    ? 'from-slate-950 via-indigo-950 to-blue-700'
    : isFocus
      ? 'from-emerald-950 via-teal-800 to-cyan-500'
      : 'from-amber-500 via-rose-500 to-fuchsia-800';

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}
    >
      <span className="absolute -top-10 -right-8 h-32 w-32 rounded-full border border-white/20 bg-white/10" />
      <span className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full border border-white/15 bg-black/10" />
      <div className="relative flex flex-col items-center text-white">
        <Icon className={compact ? 'h-6 w-6' : 'h-12 w-12'} />
        {!compact && <span className="mt-3 text-sm font-bold tracking-[0.28em] uppercase">{playlist.name}</span>}
      </div>
    </div>
  );
}

export function RestClient({
  playlists,
  tier,
  canUseRest,
}: {
  playlists: Playlist[];
  tier: SubscriptionTier;
  canUseRest: boolean;
}) {
  const data = playlists.length ? playlists : SAMPLE_PLAYLISTS;
  const [activePlaylistId, setActivePlaylistId] = useState(data[0]?.id || '');
  const [songIndex, setSongIndex] = useState(0);
  const activePlaylist = useMemo(
    () => data.find((playlist) => playlist.id === activePlaylistId) || data[0],
    [activePlaylistId, data]
  );
  const songs = useMemo(
    () => [...(activePlaylist?.playlist_songs || [])].sort((a, b) => a.order_index - b.order_index),
    [activePlaylist]
  );
  const activeSong = songs[songIndex] || null;
  const artwork =
    activeSong?.thumbnail_url ||
    (activeSong?.youtube_video_id ? `https://img.youtube.com/vi/${activeSong.youtube_video_id}/hqdefault.jpg` : null) ||
    activePlaylist?.cover_image_url ||
    null;

  const next = () => setSongIndex((index) => (songs.length ? (index + 1) % songs.length : 0));
  const prev = () => setSongIndex((index) => (songs.length ? (index - 1 + songs.length) % songs.length : 0));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="dashboard-surface border-border/70 rounded-2xl border p-5">
        <Badge className="mb-3 bg-emerald-600">
          <Sparkles className="h-3 w-3" /> Rest mode
        </Badge>
        <h1 className="text-2xl font-bold">Rest & Audio Playlists</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Audio-only breaks inspired by Kuku FM: relax briefly, then begin your next study block.
        </p>
      </section>

      {!canUseRest && (
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Relaxing playlists are available on Pro and Elite</p>
              <p className="text-muted-foreground text-sm">
                Free users can read notes and books. Premium rest playlists are available on Pro.
              </p>
            </div>
            <Button asChild variant="gradient">
              <Link href="/subscription">
                <Crown className="h-4 w-4" /> Upgrade Pro
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((playlist) => (
          <button
            key={playlist.id}
            type="button"
            onClick={() => {
              setActivePlaylistId(playlist.id);
              setSongIndex(0);
            }}
            className={`overflow-hidden rounded-2xl border text-left transition ${activePlaylist?.id === playlist.id ? 'border-violet-500 bg-violet-500/15' : 'border-border bg-card hover:bg-muted/50'}`}
          >
            <div className="bg-muted flex aspect-video items-center justify-center text-white">
              <PlaylistArtwork playlist={playlist} />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{playlist.name}</h2>
                <Badge>{playlist.is_pro ? 'Pro' : 'Free'}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {playlist.description || 'Relaxing playlist'}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">{playlist.playlist_songs?.length || 0} songs</p>
            </div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-5 sm:grid-cols-[180px,minmax(0,1fr)] sm:p-6">
          <div className="bg-muted aspect-square overflow-hidden rounded-lg">
            {activePlaylist ? (
              <PlaylistArtwork playlist={activePlaylist} source={artwork} compact />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 via-cyan-700 to-violet-700 text-white">
                <Music2 className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <Volume2 className="h-3 w-3" /> Now playing
              </Badge>
              <Badge className={tier === 'FREE' ? 'bg-muted text-muted-foreground' : 'bg-emerald-600'}>{tier}</Badge>
            </div>
            <h2 className="mt-3 truncate text-xl font-bold">
              {activeSong?.title || activePlaylist?.name || 'Select a playlist'}
            </h2>
            <p className="text-muted-foreground mt-1 truncate text-sm">
              {activeSong?.artist || activePlaylist?.description || 'Choose a playlist to listen.'}
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500" />
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={prev} disabled={!canUseRest || songs.length === 0} aria-label="Previous track">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="gradient" disabled={!canUseRest || !activeSong}>
                <Headphones className="h-4 w-4" /> Play audio
              </Button>
              <Button size="icon" variant="outline" onClick={next} disabled={!canUseRest || songs.length === 0} aria-label="Next track">
                <SkipForward className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground ml-auto text-xs">{songs.length ? `${songIndex + 1} / ${songs.length}` : 'No tracks'}</span>
            </div>
          </div>
          {canUseRest && activeSong && (
            <iframe
              src={`https://www.youtube.com/embed/${activeSong.youtube_video_id}?autoplay=1&rel=0&controls=0`}
              title={activeSong.title}
              className="pointer-events-none absolute h-px w-px opacity-0"
              allow="autoplay; encrypted-media"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
