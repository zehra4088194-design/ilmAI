import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { queueResourceContextProcessing } from '@/lib/resources/processing';
import type { Database } from '@/lib/supabase/database.types';

type PastPaperUpdate = Database['public']['Tables']['past_papers']['Update'] & {
  download_count?: number;
  grade_level?: string | null;
  chapter_id?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as PastPaperUpdate;
  const update: Database['public']['Tables']['past_papers']['Update'] = {};

  if (body.subject_id !== undefined) update.subject_id = body.subject_id;
  if (body.chapter_id !== undefined) (update as any).chapter_id = body.chapter_id;
  if (body.board !== undefined) update.board = body.board;
  if (body.grade_level !== undefined) (update as any).grade_level = body.grade_level;
  if (body.year !== undefined) update.year = Number(body.year);
  if (body.paper_type !== undefined) update.paper_type = body.paper_type;
  if (body.file_url !== undefined) update.file_url = body.file_url.trim();
  if (body.context_text_url !== undefined) update.context_text_url = body.context_text_url?.trim() || null;
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url;
  if (body.total_questions !== undefined) update.total_questions = body.total_questions;
  if (body.duration !== undefined) update.duration = body.duration;
  if (body.is_verified !== undefined) update.is_verified = body.is_verified;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields were provided for update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('past_papers').update(update).eq('id', id).select().single();

  if (error) {
    console.error('past paper update error:', error);
    return NextResponse.json({ error: `Past paper could not be updated: ${error.message}` }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Past paper was not found' }, { status: 404 });

  const sourceChanged = body.file_url !== undefined;
  const needsGeneratedContext =
    body.context_text_url === null || body.context_text_url?.trim() === '' || (sourceChanged && !data.context_text_url);
  let processingWarning: string | null = null;
  if (needsGeneratedContext) {
    try {
      await queueResourceContextProcessing('past-paper', id);
    } catch (queueError) {
      processingWarning =
        queueError instanceof Error ? queueError.message : 'The automatic OCR queue could not be started.';
      console.error('past paper context requeue error:', queueError);
    }
  }

  return NextResponse.json({
    paper: data,
    contextStatus: needsGeneratedContext ? (processingWarning ? 'queue_failed' : 'queued') : 'provided',
    warning: processingWarning,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('past_papers').delete().eq('id', id);

  if (error) {
    console.error('past paper delete error:', error);
    return NextResponse.json({ error: `Past paper could not be deleted: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
