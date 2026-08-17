'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Loader2, Music2, Plus, Trash2, UploadCloud, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

type Song = {
  id: string;
  playlist_id: string;
  title: string;
  artist: string | null;
  source_type: 'youtube' | 'audio';
  youtube_url: string | null;
  youtube_video_id: string | null;
  storage_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  order_index: number;
};

type Playlist = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_pro: boolean;
  order_index: number;
  playlist_songs?: Song[];
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = new Audio();
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? el.duration : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

export function RestLibraryAdmin() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistForm, setPlaylistForm] = useState({ name: '', description: '', cover_image_url: '', order_index: 0 });
  const [songMode, setSongMode] = useState<'audio' | 'youtube'>('audio');
  const [songForm, setSongForm] = useState({ playlist_id: '', title: '', artist: '', youtube_url: '', order_index: 0 });
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ uri: string; size: number; contentType: string; durationSeconds: number | null; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedPlaylists = useMemo(
    () => playlists.map((playlist) => ({
      ...playlist,
      playlist_songs: [...(playlist.playlist_songs || [])].sort((a, b) => a.order_index - b.order_index),
    })),
    [playlists],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/music-playlists');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Playlists could not be loaded.');
      setPlaylists(json.playlists || []);
      if (!songForm.playlist_id && json.playlists?.[0]?.id) {
        setSongForm((current) => ({ ...current, playlist_id: json.playlists[0].id }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Playlists could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [songForm.playlist_id]);

  useEffect(() => {
    load();
  }, [load]);

  const createPlaylist = async () => {
    if (!playlistForm.name.trim()) return toast.error('Playlist name required');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/music-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...playlistForm, is_pro: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Playlist could not be saved.');
      setPlaylistForm({ name: '', description: '', cover_image_url: '', order_index: 0 });
      toast.success('Playlist added.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Playlist could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleFilePick = async (file: File | undefined) => {
    if (!file) return;
    setPendingUpload(null);
    setUploadPct(0);
    try {
      const [durationSeconds] = await Promise.all([readAudioDuration(file)]);
      const form = new FormData();
      form.append('file', file);
      form.append('scope', songForm.playlist_id || 'general');

      const uploaded = await new Promise<{ uri: string; size: number; contentType: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/admin/audio-files');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadPct(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error || 'Upload failed.'));
          } catch {
            reject(new Error('Upload failed.'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed.'));
        xhr.send(form);
      });

      setPendingUpload({ ...uploaded, durationSeconds, fileName: file.name });
      if (!songForm.title.trim()) {
        setSongForm((v) => ({ ...v, title: file.name.replace(/\.[^.]+$/, '') }));
      }
      toast.success('Audio uploaded — now save the track below.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploadPct(null);
    }
  };

  const addSong = async () => {
    if (!songForm.playlist_id || !songForm.title.trim()) {
      return toast.error('Playlist and title are required');
    }
    if (songMode === 'audio' && !pendingUpload) return toast.error('Upload an audio file first');
    if (songMode === 'youtube' && !songForm.youtube_url.trim()) return toast.error('YouTube URL required');

    setSaving(true);
    try {
      const payload =
        songMode === 'audio'
          ? {
              playlist_id: songForm.playlist_id,
              title: songForm.title,
              artist: songForm.artist,
              order_index: songForm.order_index,
              source_type: 'audio',
              storage_url: pendingUpload!.uri,
              duration_seconds: pendingUpload!.durationSeconds,
              file_size_bytes: pendingUpload!.size,
              mime_type: pendingUpload!.contentType,
            }
          : {
              playlist_id: songForm.playlist_id,
              title: songForm.title,
              artist: songForm.artist,
              order_index: songForm.order_index,
              source_type: 'youtube',
              youtube_url: songForm.youtube_url,
            };
      const res = await fetch('/api/admin/music-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Track could not be saved.');
      setSongForm((current) => ({ ...current, title: '', artist: '', youtube_url: '', order_index: current.order_index + 1 }));
      setPendingUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Track added to the playlist.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Track could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist? Its tracks will also be deleted.')) return;
    const res = await fetch(`/api/admin/music-playlists?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || 'Delete fail');
    toast.success('Playlist deleted.');
    await load();
  };

  const deleteSong = async (id: string) => {
    const res = await fetch(`/api/admin/music-songs?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || 'Delete fail');
    toast.success('Track deleted.');
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rest & Audio Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Pro relaxing playlists — upload real audio files (stored in the dedicated B2 audio bucket) or link a
          YouTube video. Students listen to these during study breaks.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Music2 className="h-5 w-5 text-violet-400" />Create Playlist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Relax / Focus / Sleep" value={playlistForm.name} onChange={(e) => setPlaylistForm((v) => ({ ...v, name: e.target.value }))} />
            <Textarea placeholder="Short description" value={playlistForm.description} onChange={(e) => setPlaylistForm((v) => ({ ...v, description: e.target.value }))} />
            <Input placeholder="Cover image URL optional" value={playlistForm.cover_image_url} onChange={(e) => setPlaylistForm((v) => ({ ...v, cover_image_url: e.target.value }))} />
            <Button onClick={createPlaylist} loading={saving} variant="gradient"><Plus className="h-4 w-4" /> Add playlist</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add Track</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className="h-10 w-full rounded-lg border px-3 text-sm" value={songForm.playlist_id} onChange={(e) => setSongForm((v) => ({ ...v, playlist_id: e.target.value }))}>
              <option value="">Select playlist</option>
              {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
            </select>

            <div className="flex gap-2 rounded-lg border border-border/70 bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setSongMode('audio')}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition', songMode === 'audio' ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground hover:text-foreground')}
              >
                <Headphones className="h-3.5 w-3.5" /> Upload audio
              </button>
              <button
                type="button"
                onClick={() => setSongMode('youtube')}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition', songMode === 'youtube' ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground hover:text-foreground')}
              >
                <Youtube className="h-3.5 w-3.5" /> YouTube link
              </button>
            </div>

            <Input placeholder="Track title" value={songForm.title} onChange={(e) => setSongForm((v) => ({ ...v, title: e.target.value }))} />
            <Input placeholder="Artist optional" value={songForm.artist} onChange={(e) => setSongForm((v) => ({ ...v, artist: e.target.value }))} />

            {songMode === 'audio' ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                  onChange={(e) => handleFilePick(e.target.files?.[0])}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-violet-700"
                />
                {uploadPct !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-violet-600 transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                )}
                {pendingUpload && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <UploadCloud className="h-3.5 w-3.5" /> {pendingUpload.fileName} ready
                    {pendingUpload.durationSeconds ? ` — ${formatDuration(pendingUpload.durationSeconds)}` : ''}
                  </p>
                )}
              </div>
            ) : (
              <Input placeholder="YouTube URL" value={songForm.youtube_url} onChange={(e) => setSongForm((v) => ({ ...v, youtube_url: e.target.value }))} />
            )}

            <Button onClick={addSong} loading={saving} variant="gradient"><Plus className="h-4 w-4" /> Add track</Button>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading playlists...</CardContent></Card>
      ) : (
        <div className="grid gap-5">
          {sortedPlaylists.map((playlist) => (
            <Card key={playlist.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>{playlist.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge>Pro</Badge>
                    <Button size="icon-sm" variant="ghost" onClick={() => deletePlaylist(playlist.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{playlist.description || 'No description'}</p>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {playlist.playlist_songs?.length ? playlist.playlist_songs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-2">
                    {song.source_type === 'audio' ? (
                      <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-violet-500/15 text-violet-400">
                        <Headphones className="h-5 w-5" />
                      </div>
                    ) : (
                      <img src={song.thumbnail_url || `https://img.youtube.com/vi/${song.youtube_video_id}/hqdefault.jpg`} alt="" className="h-12 w-20 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist || (song.source_type === 'audio' ? 'Uploaded audio' : song.youtube_video_id)}
                        {song.duration_seconds ? ` · ${formatDuration(song.duration_seconds)}` : ''}
                      </p>
                    </div>
                    <Button size="icon-sm" variant="ghost" onClick={() => deleteSong(song.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No tracks yet.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
