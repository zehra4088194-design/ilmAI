import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { extractGoogleDriveFileId, getGoogleDriveThumbnailUrl } from '@/lib/utils/filePreview';
import type { Database } from '@/lib/supabase/database.types';

type LibraryInsert = Database['public']['Tables']['library_resources']['Insert'] & {
  resource_type?: 'text_book' | 'notes' | 'other';
  chapter_id?: string | null;
};
type SubjectJoin = { name: string | null } | null;
type ChapterJoin = { name: string | null } | null;

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from('library_resources')
    .select('*, subjects(name), chapters(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: `Library resources load nahi hue: ${error.message}` }, { status: 500 });

  const resources = (data ?? []).map((resource) => {
    const subjects = resource.subjects as SubjectJoin;
    const chapters = (resource as any).chapters as ChapterJoin;
    return { ...resource, subject_name: subjects?.name ?? null, chapter_name: chapters?.name ?? null };
  });

  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as LibraryInsert;
  if (!body.title?.trim() || !body.drive_url?.trim()) {
    return NextResponse.json({ error: 'Title aur Drive URL zaroori hain' }, { status: 400 });
  }
  const driveUrl = body.drive_url.trim();
  const driveFileId = body.drive_file_id ?? extractGoogleDriveFileId(driveUrl);

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from('library_resources')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      category: body.category ?? 'local',
      resource_type: body.resource_type ?? 'text_book',
      subject_id: body.subject_id ?? null,
      chapter_id: body.chapter_id ?? null,
      board: body.board ?? null,
      grade_level: body.grade_level ?? null,
      drive_url: driveUrl,
      drive_file_id: driveFileId,
      thumbnail_url: body.thumbnail_url ?? getGoogleDriveThumbnailUrl(driveUrl, driveFileId) ?? null,
      file_type: body.file_type ?? 'pdf',
      added_by: admin.id,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('library resource create error:', error);
    return NextResponse.json({ error: `Resource add nahi hua: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ resource: data }, { status: 201 });
}
