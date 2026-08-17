'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Crown,
  Headphones,
  ListMusic,
  Moon,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
  Waves,
  Youtube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { SubscriptionTier } from '@/types';

type Song = {
  id: string;
  title: string;
  artist: string | null;
  source_type?: 'youtube' | 'audio' | null;
  youtube_video_id: string | null;
  audio_url?: string | null;
  duration_seconds?: number | null;
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

type RepeatMode = 'off' | 'all' | 'one';

function formatTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getPlaylistArtwork(playlist: Playlist) {
  const firstSong = playlist.playlist_songs?.[0];
  return (
    playlist.cover_image_url ||
    firstSong?.thumbnail_url ||
    (firstSong?.youtube_video_id ? `https://img.youtube.com/vi/${firstSong.youtube_video_id}/hqdefault.jpg` : null)
  );
}

function playlistTheme(playlist: Playlist) {
  const identity = `${playlist.slug || ''} ${playlist.name}`.toLowerCase();
  const isSleep = identity.includes('sleep');
  const isFocus = identity.includes('focus');
  return {
    Icon: isSleep ? Moon : isFocus ? Brain : Waves,
    gradient: isSleep
      ? 'from-slate-950 via-indigo-950 to-blue-700'
      : isFocus
        ? 'from-emerald-950 via-teal-800 to-cyan-500'
        : 'from-amber-500 via-rose-500 to-fuchsia-800',
  };
}

function EqualizerBars({ className = 'h-3.5 w-0.5', color = 'bg-violet-400' }: { className?: string; color?: string }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn('rounded-full origin-bottom', className, color)}
          style={{
            animation: 'equalizer .6s ease-in-out infinite alternate',
            animationDelay: `${bar * 0.15}s`,
          }}
        />
      ))}
    </span>
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

  const { Icon, gradient } = playlistTheme(playlist);
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
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
  const [playerOpen, setPlayerOpen] = useState(false); // reveals the YouTube iframe for youtube-source tracks
  const [isPlaying, setIsPlaying] = useState(false); // true engine playback state, audio-source tracks only
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [seeking, setSeeking] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplayNextRef = useRef(false);

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
  const isAudioTrack = activeSong?.source_type === 'audio' && Boolean(activeSong.audio_url);
  const artwork =
    activeSong?.thumbnail_url ||
    (activeSong?.youtube_video_id ? `https://img.youtube.com/vi/${activeSong.youtube_video_id}/hqdefault.jpg` : null) ||
    activePlaylist?.cover_image_url ||
    null;

  useEffect(() => {
    if (songIndex >= songs.length) setSongIndex(0);
  }, [songIndex, songs.length]);

  // Restore the user's last volume preference.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('rest-player-volume') : null;
    if (saved) {
      const value = Number(saved);
      if (Number.isFinite(value) && value >= 0 && value <= 1) setVolume(value);
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
    if (typeof window !== 'undefined') window.localStorage.setItem('rest-player-volume', String(volume));
  }, [volume, muted]);

  const pickNextIndex = useCallback(
    (direction: 1 | -1) => {
      if (!songs.length) return 0;
      if (shuffle && songs.length > 1) {
        let candidate = songIndex;
        while (candidate === songIndex) candidate = Math.floor(Math.random() * songs.length);
        return candidate;
      }
      return (songIndex + direction + songs.length) % songs.length;
    },
    [shuffle, songIndex, songs.length]
  );

  const playAt = useCallback((index: number, autoplay: boolean) => {
    autoplayNextRef.current = autoplay;
    setSongIndex(index);
    setPlayerOpen(true);
  }, []);

  const next = useCallback(() => playAt(pickNextIndex(1), true), [pickNextIndex, playAt]);
  const prev = useCallback(() => playAt(pickNextIndex(-1), true), [pickNextIndex, playAt]);

  const selectPlaylist = (playlistId: string) => {
    setActivePlaylistId(playlistId);
    setSongIndex(0);
    setPlayerOpen(false);
    setIsPlaying(false);
    autoplayNextRef.current = false;
  };

  const selectSong = (index: number) => playAt(index, true);

  const togglePlay = () => {
    if (!canUseRest || !activeSong) return;
    if (isAudioTrack) {
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) el.play().catch(() => {});
      else el.pause();
    } else {
      setPlayerOpen((open) => !open);
    }
  };

  // Wire the shared <audio> element to whichever track is active. Runs whenever the
  // track identity or its signed playback URL changes — not on every render — so we
  // never yank playback mid-song for an unrelated state update.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !isAudioTrack || !activeSong?.audio_url) return;
    if (el.src !== activeSong.audio_url) {
      el.src = activeSong.audio_url;
      el.currentTime = 0;
      setCurrentTime(0);
      setDuration(activeSong.duration_seconds || 0);
    }
    if (autoplayNextRef.current) {
      el.play().catch(() => {});
      autoplayNextRef.current = false;
    }
  }, [activeSong?.id, activeSong?.audio_url, isAudioTrack, activeSong?.duration_seconds]);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
      return;
    }
    if (repeatMode === 'off' && !shuffle && songIndex === songs.length - 1) {
      setIsPlaying(false);
      return;
    }
    next();
  }, [next, repeatMode, shuffle, songIndex, songs.length]);

  const seekTo = (value: number) => {
    const el = audioRef.current;
    if (!el || !isAudioTrack) return;
    el.currentTime = value;
    setCurrentTime(value);
  };

  // Media Session — lock-screen / OS media-key controls for the audio-file tracks.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !activeSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeSong.title,
      artist: activeSong.artist || activePlaylist?.name || 'Ilm AI Rest',
      album: activePlaylist?.name || 'Rest & Audio Library',
      artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (isAudioTrack && details.seekTime !== undefined) seekTo(details.seekTime);
    });
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSong?.id, next, prev, isAudioTrack]);

  const progressPct = duration > 0 ? ((seeking ?? currentTime) / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-28">
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || activeSong?.duration_seconds || 0)}
        onEnded={handleEnded}
      />

      <section className="dashboard-surface border-border/70 rounded-2xl border p-5">
        <Badge className="mb-3 bg-emerald-600">
          <Sparkles className="h-3 w-3" /> Rest mode
        </Badge>
        <h1 className="text-2xl font-bold">Rest & Audio Library</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Studio-quality audio breaks: relax briefly with real tracks or curated playlists, then get back into your next
          study block.
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
          {data.map((playlist) => {
            const isActivePlaylist = activePlaylist?.id === playlist.id;
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => selectPlaylist(playlist.id)}
                className={cn(
                  'group overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200',
                  isActivePlaylist
                    ? 'border-violet-500 bg-violet-500/15 shadow-violet-500/10'
                    : 'border-border bg-card hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg'
                )}
              >
                <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden text-white">
                  <PlaylistArtwork playlist={playlist} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity group-hover:opacity-80" />
                  {isActivePlaylist && isPlaying && (
                    <span className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1.5 backdrop-blur">
                      <EqualizerBars />
                    </span>
                  )}
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
                    {(playlist.playlist_songs || []).filter((song) => song.is_active !== false).length} tracks
                  </p>
                </div>
              </button>
            );
          })}
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
              <div className="border-border/70 relative border-b p-4 sm:p-5 lg:border-r lg:border-b-0">
                {activeSong ? (
                  <>
                    <div className="bg-muted relative aspect-video overflow-hidden rounded-lg shadow-inner">
                      {isAudioTrack ? (
                        <button
                          type="button"
                          onClick={() => canUseRest && togglePlay()}
                          disabled={!canUseRest}
                          className="group relative h-full w-full disabled:cursor-not-allowed"
                          aria-label={isPlaying ? `Pause ${activeSong.title}` : `Play ${activeSong.title}`}
                        >
                          <PlaylistArtwork playlist={activePlaylist} source={artwork} compact />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/40">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform group-hover:scale-105">
                              {!canUseRest ? (
                                <Crown className="h-6 w-6" />
                              ) : isPlaying ? (
                                <Pause className="h-7 w-7 fill-current" />
                              ) : (
                                <Play className="ml-1 h-7 w-7 fill-current" />
                              )}
                            </span>
                          </span>
                          {isPlaying && (
                            <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1.5 backdrop-blur">
                              <EqualizerBars />
                            </span>
                          )}
                        </button>
                      ) : canUseRest && playerOpen ? (
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

                    {isAudioTrack && (
                      <div className="mt-3">
                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          step={0.1}
                          value={seeking ?? currentTime}
                          disabled={!canUseRest || !duration}
                          onChange={(e) => setSeeking(Number(e.target.value))}
                          onMouseUp={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
                          onKeyUp={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
                          className="rest-seek w-full"
                          style={{ ['--progress' as any]: `${progressPct}%` }}
                          aria-label="Seek"
                        />
                        <div className="text-muted-foreground mt-1 flex justify-between text-xs tabular-nums">
                          <span>{formatTime(seeking ?? currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex min-w-0 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-bold">{activeSong.title}</h2>
                        <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
                          {isAudioTrack ? <Headphones className="h-3.5 w-3.5 shrink-0" /> : <Youtube className="h-3.5 w-3.5 shrink-0" />}
                          {activeSong.artist || activePlaylist.name}
                        </p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant={shuffle ? 'gradient' : 'outline'}
                        onClick={() => setShuffle((v) => !v)}
                        disabled={!canUseRest}
                        aria-label="Shuffle"
                        aria-pressed={shuffle}
                        className="hidden sm:inline-flex"
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={prev} disabled={!canUseRest || songs.length < 2} aria-label="Previous track">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={togglePlay} disabled={!canUseRest} variant="gradient" aria-label={isPlaying || playerOpen ? 'Pause' : 'Play'}>
                        {isAudioTrack && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={next} disabled={!canUseRest || songs.length < 2} aria-label="Next track">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant={repeatMode !== 'off' ? 'gradient' : 'outline'}
                        onClick={() => setRepeatMode((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'))}
                        disabled={!canUseRest}
                        aria-label={`Repeat: ${repeatMode}`}
                        className="hidden sm:inline-flex"
                      >
                        <RepeatIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center text-center">
                    <ListMusic className="text-muted-foreground h-9 w-9" />
                    <h2 className="mt-3 font-bold">{activePlaylist.name} has no tracks yet</h2>
                    <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                      Tracks will appear here after they are added to this playlist.
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
                  {songs.length ? songs.map((song, index) => {
                    const active = index === songIndex;
                    const trackIsAudio = song.source_type === 'audio' && Boolean(song.audio_url);
                    return (
                      <button
                        key={song.id}
                        type="button"
                        onClick={() => canUseRest && selectSong(index)}
                        disabled={!canUseRest}
                        className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition disabled:cursor-not-allowed ${active ? 'bg-violet-500/15 text-foreground' : 'hover:bg-muted/70'}`}
                      >
                        <span className="text-muted-foreground flex w-5 items-center justify-center text-center text-xs">
                          {active && isPlaying ? <EqualizerBars className="h-3 w-0.5" /> : index + 1}
                        </span>
                        <img
                          src={song.thumbnail_url || (song.youtube_video_id ? `https://img.youtube.com/vi/${song.youtube_video_id}/mqdefault.jpg` : '')}
                          alt=""
                          className="bg-muted h-11 w-16 rounded object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{song.title}</span>
                          <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                            {trackIsAudio ? <Headphones className="h-3 w-3 shrink-0" /> : <Youtube className="h-3 w-3 shrink-0" />}
                            {song.artist || activePlaylist.name}
                          </span>
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatTime(song.duration_seconds)}
                        </span>
                      </button>
                    );
                  }) : (
                    <p className="text-muted-foreground p-4 text-center text-sm">No tracks added.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persistent mini player — stays put while browsing so playback never gets lost when scrolling. */}
      {activeSong && (isPlaying || playerOpen) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-lg shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
          {isAudioTrack && (
            <div className="h-0.5 w-full bg-muted">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width]" style={{ width: `${progressPct}%` }} />
            </div>
          )}
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-5">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md shadow">
              <PlaylistArtwork playlist={activePlaylist!} source={artwork} compact />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{activeSong.title}</p>
              <p className="text-muted-foreground truncate text-xs">{activeSong.artist || activePlaylist?.name}</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button size="icon-sm" variant="ghost" onClick={prev} disabled={songs.length < 2} aria-label="Previous track" className="hidden sm:inline-flex">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="gradient" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isAudioTrack && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={next} disabled={songs.length < 2} aria-label="Next track" className="hidden sm:inline-flex">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            {isAudioTrack && (
              <div className="hidden items-center gap-1.5 md:flex">
                <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'} className="text-muted-foreground hover:text-foreground">
                  <VolumeIcon className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setMuted(false);
                    setVolume(Number(e.target.value));
                  }}
                  className="rest-volume w-20"
                  aria-label="Volume"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .rest-seek {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(to right, hsl(var(--brand-primary, 262 83% 58%)) var(--progress, 0%), hsl(var(--muted)) var(--progress, 0%));
          cursor: pointer;
        }
        .rest-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          margin-top: -4px;
        }
        .rest-seek::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border: none;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .rest-seek::-moz-range-progress {
          background: hsl(var(--brand-primary, 262 83% 58%));
          border-radius: 9999px;
        }
        .rest-volume {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          background: hsl(var(--muted));
          cursor: pointer;
        }
        .rest-volume::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 11px;
          width: 11px;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          margin-top: -3.5px;
        }
        .rest-volume::-moz-range-thumb {
          height: 11px;
          width: 11px;
          border: none;
          border-radius: 9999px;
          background: white;
        }
      `}</style>
    </div>
  );
}
