import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { extractGoogleDriveFileId, getGoogleDriveThumbnailUrl } from '@/lib/utils/filePreview';
import { queueResourceContextProcessing } from '@/lib/resources/processing';
import type { Database } from '@/lib/supabase/database.types';

type LibraryInsert = Database['public']['Tables']['library_resources']['Insert'] & {
  resource_type?: 'text_book' | 'notes' | 'other';
  chapter_id?: string | null;
  light_file_url?: string | null;
  dark_file_url?: string | null;
  context_text_url?: string | null;
  book_title?: string | null;
  content_section?: 'reading' | 'mcq' | 'short' | 'long';
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase admin client missing' },
      { status: 500 }
    );
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
  const lightFileUrl = (body.light_file_url ?? body.drive_url ?? '').trim();
  const darkFileUrl = body.dark_file_url?.trim() || null;
  const contextTextUrl = body.context_text_url?.trim() || null;
  if (!body.title?.trim() || !lightFileUrl) {
    return NextResponse.json({ error: 'Title aur PDF URL zaroori hain' }, { status: 400 });
  }
  const driveUrl = lightFileUrl;
  const driveFileId = body.drive_file_id ?? extractGoogleDriveFileId(driveUrl);

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase admin client missing' },
      { status: 500 }
    );
  }

  const { data, error } = await adminClient
    .from('library_resources')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      category: body.category ?? 'local',
      resource_type: body.resource_type ?? 'text_book',
      book_title: body.book_title?.trim() || body.title.trim(),
      content_section: body.content_section ?? 'reading',
      subject_id: body.subject_id ?? null,
      chapter_id: body.chapter_id ?? null,
      board: body.board ?? null,
      grade_level: body.grade_level ?? null,
      drive_url: driveUrl,
      drive_file_id: driveFileId,
      light_file_url: lightFileUrl,
      dark_file_url: darkFileUrl,
      context_text_url: contextTextUrl,
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

  let processingWarning: string | null = null;
  {
    try {
      await queueResourceContextProcessing('library', data.id);
    } catch (queueError) {
      processingWarning =
        queueError instanceof Error ? queueError.message : 'Automatic OCR queue start nahi ho saki.';
      console.error('library context queue error:', queueError);
    }
  }

  return NextResponse.json(
    {
      resource: data,
      contextStatus: processingWarning ? 'queue_failed' : contextTextUrl ? 'provided_and_queued' : 'queued',
      warning: processingWarning,
    },
    { status: 201 }
  );
}
