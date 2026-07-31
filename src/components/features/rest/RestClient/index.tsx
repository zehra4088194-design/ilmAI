'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Brain, Crown, Headphones, ListMusic, Moon, Music2, Play, SkipBack, SkipForward, Sparkles, Waves } from 'lucide-react';
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
  is_active?: boolean;
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
  const data = playlists;
  const [activePlaylistId, setActivePlaylistId] = useState(data[0]?.id || '');
  const [songIndex, setSongIndex] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const activePlaylist = useMemo(
    () => data.find((playlist) => playlist.id === activePlaylistId) || data[0],
    [activePlaylistId, data]
  );
  const songs = useMemo(
    () =>
      [...(activePlaylist?.playlist_songs || [])]
        .filter((song) => song.is_active !== false)
        .sort((a, b) => a.order_index - b.order_index),
    [activePlaylist]
  );
  const activeSong = songs[songIndex] || null;
  const artwork =
    activeSong?.thumbnail_url ||
    (activeSong?.youtube_video_id ? `https://img.youtube.com/vi/${activeSong.youtube_video_id}/hqdefault.jpg` : null) ||
    activePlaylist?.cover_image_url ||
    null;

  useEffect(() => {
    if (songIndex >= songs.length) setSongIndex(0);
  }, [songIndex, songs.length]);

  const selectPlaylist = (playlistId: string) => {
    setActivePlaylistId(playlistId);
    setSongIndex(0);
    setPlayerOpen(false);
  };

  const selectSong = (index: number) => {
    setSongIndex(index);
    setPlayerOpen(true);
  };

  const next = () => {
    setSongIndex((index) => (songs.length ? (index + 1) % songs.length : 0));
    setPlayerOpen(true);
  };

  const prev = () => {
    setSongIndex((index) => (songs.length ? (index - 1 + songs.length) % songs.length : 0));
    setPlayerOpen(true);
  };

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

      {data.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => selectPlaylist(playlist.id)}
              className={`overflow-hidden rounded-lg border text-left transition ${activePlaylist?.id === playlist.id ? 'border-violet-500 bg-violet-500/15' : 'border-border bg-card hover:bg-muted/50'}`}
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
                <p className="text-muted-foreground mt-3 text-xs">
                  {(playlist.playlist_songs || []).filter((song) => song.is_active !== false).length} songs
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <Music2 className="text-muted-foreground h-8 w-8" />
            <p className="mt-3 font-semibold">No playlists available</p>
            <p className="text-muted-foreground mt-1 text-sm">The rest library has not been filled yet.</p>
          </CardContent>
        </Card>
      )}

      {activePlaylist && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="border-border/70 border-b p-4 sm:p-5 lg:border-r lg:border-b-0">
                {activeSong ? (
                  <>
                    <div className="bg-muted aspect-video overflow-hidden rounded-lg">
                      {canUseRest && playerOpen ? (
                        <iframe
                          key={activeSong.id}
                          src={`https://www.youtube.com/embed/${activeSong.youtube_video_id}?autoplay=1&rel=0&playsinline=1`}
                          title={`${activeSong.title} audio player`}
                          className="h-full w-full"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => canUseRest && setPlayerOpen(true)}
                          disabled={!canUseRest}
                          className="group relative h-full w-full disabled:cursor-not-allowed"
                          aria-label={`Play ${activeSong.title}`}
                        >
                          <PlaylistArtwork playlist={activePlaylist} source={artwork} compact />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg">
                              {canUseRest ? <Play className="ml-1 h-6 w-6 fill-current" /> : <Crown className="h-6 w-6" />}
                            </span>
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex min-w-0 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold">{activeSong.title}</h2>
                        <p className="text-muted-foreground truncate text-sm">
                          {activeSong.artist || activePlaylist.name}
                        </p>
                      </div>
                      <Button size="icon" variant="outline" onClick={prev} disabled={!canUseRest || songs.length < 2} aria-label="Previous track">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      {!playerOpen && (
                        <Button onClick={() => setPlayerOpen(true)} disabled={!canUseRest} variant="gradient">
                          <Headphones className="h-4 w-4" /> Listen
                        </Button>
                      )}
                      <Button size="icon" variant="outline" onClick={next} disabled={!canUseRest || songs.length < 2} aria-label="Next track">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center text-center">
                    <ListMusic className="text-muted-foreground h-9 w-9" />
                    <h2 className="mt-3 font-bold">{activePlaylist.name} has no tracks yet</h2>
                    <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                      Songs will appear here after they are added to this playlist.
                    </p>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="border-border/70 flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ListMusic className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{activePlaylist.name} tracks</h3>
                  </div>
                  <Badge className={tier === 'FREE' ? 'bg-muted text-muted-foreground' : 'bg-emerald-600'}>{tier}</Badge>
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {songs.length ? songs.map((song, index) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => canUseRest && selectSong(index)}
                      disabled={!canUseRest}
                      className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition disabled:cursor-not-allowed ${index === songIndex ? 'bg-violet-500/15 text-foreground' : 'hover:bg-muted/70'}`}
                    >
                      <span className="text-muted-foreground w-5 text-center text-xs">{index + 1}</span>
                      <img
                        src={song.thumbnail_url || `https://img.youtube.com/vi/${song.youtube_video_id}/mqdefault.jpg`}
                        alt=""
                        className="h-11 w-16 rounded object-cover"
                        loading="lazy"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{song.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">{song.artist || activePlaylist.name}</span>
                      </span>
                      {index === songIndex && <Play className="h-4 w-4 fill-current text-violet-400" />}
                    </button>
                  )) : (
                    <p className="text-muted-foreground p-4 text-center text-sm">No tracks added.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
