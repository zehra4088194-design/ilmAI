'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Headphones, ListMusic, Music2, PauseCircle, SkipBack, SkipForward, Sparkles, Volume2 } from 'lucide-react';
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
];

export function RestClient({ playlists, tier, canUseRest }: { playlists: Playlist[]; tier: SubscriptionTier; canUseRest: boolean }) {
  const data = playlists.length ? playlists : SAMPLE_PLAYLISTS;
  const [activePlaylistId, setActivePlaylistId] = useState(data[0]?.id || '');
  const [songIndex, setSongIndex] = useState(0);
  const activePlaylist = useMemo(() => data.find((playlist) => playlist.id === activePlaylistId) || data[0], [activePlaylistId, data]);
  const songs = useMemo(() => [...(activePlaylist?.playlist_songs || [])].sort((a, b) => a.order_index - b.order_index), [activePlaylist]);
  const activeSong = songs[songIndex] || null;
  const artwork = activeSong?.thumbnail_url || activePlaylist?.cover_image_url || null;

  const next = () => setSongIndex((index) => (songs.length ? (index + 1) % songs.length : 0));
  const prev = () => setSongIndex((index) => (songs.length ? (index - 1 + songs.length) % songs.length : 0));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="dashboard-surface rounded-2xl border border-border/70 p-5">
        <Badge className="mb-3 bg-emerald-600"><Sparkles className="h-3 w-3" /> Rest mode</Badge>
        <h1 className="text-2xl font-bold">Rest & Audio Playlists</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Kuku FM style audio-only breaks: relax your mind, short rest lo, phir next study block start karo.
        </p>
      </section>

      {!canUseRest && (
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Relaxing playlists Pro/Elite feature hain</p>
              <p className="text-sm text-muted-foreground">Free users notes/books read kar sakte hain; premium rest playlists Pro mein unlock hoti hain.</p>
            </div>
            <Button asChild variant="gradient"><Link href="/subscription"><Crown className="h-4 w-4" /> Upgrade Pro</Link></Button>
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
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-emerald-600 via-cyan-700 to-violet-700 text-white">
              {playlist.cover_image_url ? <img src={playlist.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-12 w-12" />}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{playlist.name}</h2>
                <Badge>{playlist.is_pro ? 'Pro' : 'Free'}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{playlist.description || 'Relaxing playlist'}</p>
              <p className="mt-3 text-xs text-muted-foreground">{playlist.playlist_songs?.length || 0} songs</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),390px]">
        <Card className="overflow-hidden border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--brand-accent)/0.22),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.82))]">
          <CardContent className="p-0">
            <div className="grid min-h-[420px] gap-0 md:grid-cols-[330px,1fr]">
              <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-cyan-700 to-violet-800 p-6 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.28),transparent_28%)]" />
                <div className="relative">
                  <Badge className="bg-white/18 text-white backdrop-blur"><Headphones className="h-3 w-3" /> Audio only</Badge>
                  <div className="mt-8 aspect-square overflow-hidden rounded-[2rem] border border-white/25 bg-white/15 shadow-2xl shadow-black/35">
                    {artwork ? (
                      <img src={artwork} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music2 className="h-20 w-20 opacity-90" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative mt-6 flex items-end gap-1.5">
                  {[38, 58, 28, 72, 46, 64, 34, 52, 80, 42, 62, 30].map((height, index) => (
                    <span
                      key={index}
                      className="w-2 rounded-full bg-white/80"
                      style={{ height, animation: `equalizer ${1.2 + (index % 4) * 0.18}s ease-in-out infinite alternate` }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between p-5 sm:p-7">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary"><Volume2 className="h-3 w-3" /> Relax your mind</Badge>
                    <Badge className={tier === 'FREE' ? 'bg-muted text-muted-foreground' : 'bg-emerald-600'}>{tier}</Badge>
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight">{activeSong?.title || activePlaylist?.name || 'Select a playlist'}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{activeSong?.artist || activePlaylist?.description || 'Short audio break, then back to focused study.'}</p>

                  {canUseRest && activeSong ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${activeSong.youtube_video_id}?autoplay=1&rel=0&controls=0`}
                      title={activeSong.title}
                      className="pointer-events-none absolute h-px w-px opacity-0"
                      allow="autoplay; encrypted-media"
                    />
                  ) : (
                    <div className="mt-8 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/35 p-5 text-center">
                      <PauseCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="font-semibold">{canUseRest ? 'Playlist mein audio add karo' : 'Pro playlist locked'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Admin panel se YouTube audio tracks add honge; student ko video nahi dikhegi.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500" />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      Track {songs.length ? songIndex + 1 : 0} of {songs.length}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={prev} disabled={!canUseRest || songs.length === 0}><SkipBack className="h-4 w-4" /></Button>
                      <Button variant="gradient" disabled={!canUseRest || !activeSong}><Headphones className="h-4 w-4" /> Playing Audio</Button>
                      <Button size="icon" variant="outline" onClick={next} disabled={!canUseRest || songs.length === 0}><SkipForward className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="flex items-center gap-2 font-bold"><ListMusic className="h-4 w-4 text-emerald-500" /> {activePlaylist?.name || 'Playlist'}</h2>
            {songs.length ? songs.map((song, index) => (
              <button
                key={song.id}
                type="button"
                onClick={() => setSongIndex(index)}
                disabled={!canUseRest}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${index === songIndex ? 'border-violet-500 bg-violet-500/15' : 'border-border bg-muted/25 hover:bg-muted/45'}`}
              >
                <img src={song.thumbnail_url || `https://img.youtube.com/vi/${song.youtube_video_id}/hqdefault.jpg`} alt="" className="h-12 w-20 rounded object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{song.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{song.artist || 'YouTube'}</p>
                </div>
              </button>
            )) : <p className="text-sm text-muted-foreground">Admin panel se songs add karo.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
