import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { deriveThumbnailFromUrl } from '@/lib/utils/extractYouTubeId';
import type { Database } from '@/lib/supabase/database.types';

type LectureUpdate = Database['public']['Tables']['lectures']['Update'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as LectureUpdate;
  const update: LectureUpdate = {};

  if (body.chapter_id !== undefined) update.chapter_id = body.chapter_id;
  if (body.topic_id !== undefined) update.topic_id = body.topic_id;
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.youtube_url !== undefined) {
    update.youtube_url = body.youtube_url.trim();
    if (body.thumbnail_url === undefined) update.thumbnail_url = deriveThumbnailFromUrl(body.youtube_url) ?? null;
  }
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url;
  if (body.kind !== undefined) update.kind = body.kind;
  if (body.exercise_number !== undefined) update.exercise_number = body.exercise_number?.trim() || null;
  if (body.order_index !== undefined) update.order_index = body.order_index;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields were provided for update' }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const { data, error } = await adminClient.from('lectures').update(update).eq('id', id).select().single();

  if (error) {
    console.error('lecture update error:', error);
    return NextResponse.json({ error: `Lecture could not be updated: ${error.message}` }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Lecture was not found' }, { status: 404 });

  return NextResponse.json({ lecture: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const { error } = await adminClient.from('lectures').delete().eq('id', id);

  if (error) {
    console.error('lecture delete error:', error);
    return NextResponse.json({ error: `Lecture could not be deleted: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
