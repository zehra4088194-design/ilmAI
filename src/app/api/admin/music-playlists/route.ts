import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = await createAdminClient();
  const { data, error } = await (db.from('music_playlists' as any) as any)
    .select('*, playlist_songs(*)')
    .order('order_index', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlists: data || [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Playlist name required' }, { status: 400 });
  const db = await createAdminClient();
  const { data, error } = await (db.from('music_playlists' as any) as any)
    .insert({
      name,
      slug: slugify(body.slug || name),
      description: body.description || null,
      cover_image_url: body.cover_image_url || null,
      is_pro: body.is_pro !== false,
      order_index: Number(body.order_index || 0),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'Playlist id required' }, { status: 400 });
  const db = await createAdminClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.slug !== undefined || body.name !== undefined) update.slug = slugify(body.slug || body.name);
  if (body.description !== undefined) update.description = body.description || null;
  if (body.cover_image_url !== undefined) update.cover_image_url = body.cover_image_url || null;
  if (body.is_pro !== undefined) update.is_pro = body.is_pro === true;
  if (body.order_index !== undefined) update.order_index = Number(body.order_index || 0);

  const { data, error } = await (db.from('music_playlists' as any) as any).update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Playlist id required' }, { status: 400 });
  const db = await createAdminClient();
  const { error } = await (db.from('music_playlists' as any) as any).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
