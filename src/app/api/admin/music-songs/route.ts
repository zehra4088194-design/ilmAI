import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/utils/extractYouTubeId';

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const playlistId = String(body.playlist_id || '');
  const title = String(body.title || '').trim();
  const youtubeUrl = String(body.youtube_url || '').trim();
  const videoId = extractYouTubeId(youtubeUrl);
  if (!playlistId || !title || !videoId) {
    return NextResponse.json({ error: 'Playlist, title, and a valid YouTube URL are required' }, { status: 400 });
  }
  const db = await createAdminClient();
  const { data, error } = await (db.from('playlist_songs' as any) as any)
    .insert({
      playlist_id: playlistId,
      title,
      artist: body.artist || null,
      youtube_url: youtubeUrl,
      youtube_video_id: videoId,
      thumbnail_url: body.thumbnail_url || getYouTubeThumbnail(videoId),
      order_index: Number(body.order_index || 0),
      is_active: body.is_active !== false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'Song id required' }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.playlist_id !== undefined) update.playlist_id = body.playlist_id;
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.artist !== undefined) update.artist = body.artist || null;
  if (body.youtube_url !== undefined) {
    const videoId = extractYouTubeId(String(body.youtube_url || ''));
    if (!videoId) return NextResponse.json({ error: 'Valid YouTube URL required' }, { status: 400 });
    update.youtube_url = String(body.youtube_url).trim();
    update.youtube_video_id = videoId;
    update.thumbnail_url = body.thumbnail_url || getYouTubeThumbnail(videoId);
  }
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url || null;
  if (body.order_index !== undefined) update.order_index = Number(body.order_index || 0);
  if (body.is_active !== undefined) update.is_active = body.is_active === true;

  const db = await createAdminClient();
  const { data, error } = await (db.from('playlist_songs' as any) as any).update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Song id required' }, { status: 400 });
  const db = await createAdminClient();
  const { error } = await (db.from('playlist_songs' as any) as any).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
