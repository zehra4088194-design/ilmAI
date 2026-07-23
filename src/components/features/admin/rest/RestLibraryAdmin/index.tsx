'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Music2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Song = {
  id: string;
  playlist_id: string;
  title: string;
  artist: string | null;
  youtube_url: string;
  youtube_video_id: string;
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

export function RestLibraryAdmin() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistForm, setPlaylistForm] = useState({ name: '', description: '', cover_image_url: '', order_index: 0 });
  const [songForm, setSongForm] = useState({ playlist_id: '', title: '', artist: '', youtube_url: '', order_index: 0 });
  const [saving, setSaving] = useState(false);

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

  const addSong = async () => {
    if (!songForm.playlist_id || !songForm.title.trim() || !songForm.youtube_url.trim()) {
      return toast.error('Playlist, title, and YouTube URL are required');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/music-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Song could not be saved.');
      setSongForm((current) => ({ ...current, title: '', artist: '', youtube_url: '', order_index: current.order_index + 1 }));
      toast.success('Song added to the playlist.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Song could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist? Its songs will also be deleted.')) return;
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
    toast.success('Song deleted.');
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rest Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Pro relaxing playlists. Students can listen to calming sounds here during study breaks.
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
          <CardHeader><CardTitle>Add Song</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className="h-10 rounded-lg border px-3 text-sm" value={songForm.playlist_id} onChange={(e) => setSongForm((v) => ({ ...v, playlist_id: e.target.value }))}>
              <option value="">Select playlist</option>
              {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
            </select>
            <Input placeholder="Song title" value={songForm.title} onChange={(e) => setSongForm((v) => ({ ...v, title: e.target.value }))} />
            <Input placeholder="Artist optional" value={songForm.artist} onChange={(e) => setSongForm((v) => ({ ...v, artist: e.target.value }))} />
            <Input placeholder="YouTube URL" value={songForm.youtube_url} onChange={(e) => setSongForm((v) => ({ ...v, youtube_url: e.target.value }))} />
            <Button onClick={addSong} loading={saving} variant="gradient"><Plus className="h-4 w-4" /> Add song</Button>
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
                    <img src={song.thumbnail_url || `https://img.youtube.com/vi/${song.youtube_video_id}/hqdefault.jpg`} alt="" className="h-12 w-20 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{song.artist || song.youtube_video_id}</p>
                    </div>
                    <Button size="icon-sm" variant="ghost" onClick={() => deleteSong(song.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No songs yet.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
