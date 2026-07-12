import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { extractGoogleDriveFileId, getGoogleDriveThumbnailUrl } from '@/lib/utils/filePreview';
import type { Database } from '@/lib/supabase/database.types';

type LibraryUpdate = Database['public']['Tables']['library_resources']['Update'] & {
  resource_type?: 'text_book' | 'notes' | 'other';
  chapter_id?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as LibraryUpdate;
  const update: LibraryUpdate = {};

  if (body.title !== undefined) update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description;
  if (body.category !== undefined) update.category = body.category;
  if (body.resource_type !== undefined) (update as any).resource_type = body.resource_type;
  if (body.subject_id !== undefined) update.subject_id = body.subject_id;
  if (body.chapter_id !== undefined) (update as any).chapter_id = body.chapter_id;
  if (body.board !== undefined) update.board = body.board;
  if (body.grade_level !== undefined) update.grade_level = body.grade_level;
  if (body.drive_url !== undefined) {
    const driveUrl = body.drive_url.trim();
    const driveFileId = body.drive_file_id ?? extractGoogleDriveFileId(driveUrl);
    update.drive_url = driveUrl;
    update.drive_file_id = driveFileId;
    if (body.thumbnail_url === undefined) update.thumbnail_url = getGoogleDriveThumbnailUrl(driveUrl, driveFileId);
  }
  if (body.drive_file_id !== undefined) update.drive_file_id = body.drive_file_id;
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url;
  if (body.file_type !== undefined) update.file_type = body.file_type;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Koi field update ke liye nahi diya' }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const { data, error } = await (adminClient.from('library_resources') as any).update(update).eq('id', id).select().single();

  if (error) {
    console.error('library resource update error:', error);
    return NextResponse.json({ error: `Resource update nahi hua: ${error.message}` }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Resource nahi mila' }, { status: 404 });

  return NextResponse.json({ resource: data });
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

  const { error } = await adminClient.from('library_resources').delete().eq('id', id);

  if (error) {
    console.error('library resource delete error:', error);
    return NextResponse.json({ error: `Resource delete nahi hua: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
