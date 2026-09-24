import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { deleteR2Object, parseR2Uri } from '@/lib/storage/r2';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/utils/extractYouTubeId';

function audioPayload(body: any) {
  const storageUrl = String(body.storage_url || '').trim();
  if (!storageUrl || !parseR2Uri(storageUrl)) return null;
  return {
    source_type: 'audio' as const,
    storage_url: storageUrl,
    youtube_url: null,
    youtube_video_id: null,
    thumbnail_url: body.thumbnail_url || null,
    duration_seconds: body.duration_seconds ? Math.round(Number(body.duration_seconds)) : null,
    file_size_bytes: body.file_size_bytes ? Math.round(Number(body.file_size_bytes)) : null,
    mime_type: body.mime_type || null,
  };
}

function youtubePayload(body: any) {
  const youtubeUrl = String(body.youtube_url || '').trim();
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return null;
  return {
    source_type: 'youtube' as const,
    youtube_url: youtubeUrl,
    youtube_video_id: videoId,
    storage_url: null,
    duration_seconds: body.duration_seconds ? Math.round(Number(body.duration_seconds)) : null,
    file_size_bytes: null,
    mime_type: null,
    thumbnail_url: body.thumbnail_url || getYouTubeThumbnail(videoId),
  };
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const playlistId = String(body.playlist_id || '');
  const title = String(body.title || '').trim();
  if (!playlistId || !title) {
    return NextResponse.json({ error: 'Playlist and title are required' }, { status: 400 });
  }

  const source = body.source_type === 'audio' ? audioPayload(body) : youtubePayload(body);
  if (!source) {
    return NextResponse.json(
      { error: body.source_type === 'audio' ? 'An uploaded audio file is required.' : 'A valid YouTube URL is required.' },
      { status: 400 }
    );
  }

  const db = await createAdminClient();
  const { data, error } = await (db.from('playlist_songs' as any) as any)
    .insert({
      playlist_id: playlistId,
      title,
      artist: body.artist || null,
      order_index: Number(body.order_index || 0),
      is_active: body.is_active !== false,
      ...source,
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
  if (body.source_type === 'audio') {
    const source = audioPayload(body);
    if (!source) return NextResponse.json({ error: 'A valid uploaded audio file is required.' }, { status: 400 });
    Object.assign(update, source);
  } else if (body.source_type === 'youtube' || body.youtube_url !== undefined) {
    const source = youtubePayload(body);
    if (!source) return NextResponse.json({ error: 'Valid YouTube URL required' }, { status: 400 });
    Object.assign(update, source);
  }
  if (body.thumbnail_url !== undefined && update.thumbnail_url === undefined) update.thumbnail_url = body.thumbnail_url || null;
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
  const { data: existing } = await (db.from('playlist_songs' as any) as any)
    .select('source_type, storage_url')
    .eq('id', id)
    .maybeSingle();
  const { error } = await (db.from('playlist_songs' as any) as any).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (existing?.source_type === 'audio' && existing.storage_url) {
    const parsed = parseR2Uri(existing.storage_url);
    if (parsed) await deleteR2Object(parsed.key, parsed.bucket).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
