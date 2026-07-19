import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { queueResourceContextProcessing } from '@/lib/resources/processing';
import type { Database } from '@/lib/supabase/database.types';

type PastPaperInsert = Database['public']['Tables']['past_papers']['Insert'] & {
  grade_level?: string | null;
  chapter_id?: string | null;
};
type SubjectJoin = { name: string | null } | null;
type ChapterJoin = { name: string | null } | null;

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('past_papers')
    .select('*, subjects(name), chapters(name)')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Past papers load nahi hue' }, { status: 500 });

  const papers = (data ?? []).map((paper) => {
    const subjects = paper.subjects as SubjectJoin;
    const chapters = (paper as any).chapters as ChapterJoin;
    return { ...paper, subject_name: subjects?.name ?? null, chapter_name: chapters?.name ?? null };
  });

  return NextResponse.json({ papers });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as PastPaperInsert;
  const year = Number(body.year);
  if (!body.subject_id || !body.board || !body.file_url?.trim() || !Number.isInteger(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ error: 'Subject, board, valid year aur PDF URL zaroori hain' }, { status: 400 });
  }
  const contextTextUrl = body.context_text_url?.trim() || null;

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('past_papers')
    .insert({
      subject_id: body.subject_id,
      chapter_id: body.chapter_id ?? null,
      board: body.board,
      grade_level: body.grade_level ?? null,
      year,
      paper_type: body.paper_type ?? 'ANNUAL',
      file_url: body.file_url.trim(),
      context_text_url: contextTextUrl,
      total_questions: body.total_questions ?? 0,
      duration: body.duration ?? 180,
      is_verified: body.is_verified ?? false,
      thumbnail_url: body.thumbnail_url ?? null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('past paper create error:', error);
    return NextResponse.json({ error: `Past paper add nahi hua: ${error.message}` }, { status: 500 });
  }

  let processingWarning: string | null = null;
  {
    try {
      await queueResourceContextProcessing('past-paper', data.id);
    } catch (queueError) {
      processingWarning =
        queueError instanceof Error ? queueError.message : 'Automatic OCR queue start nahi ho saki.';
      console.error('past paper context queue error:', queueError);
    }
  }

  return NextResponse.json(
    {
      paper: data,
      contextStatus: processingWarning ? 'queue_failed' : contextTextUrl ? 'provided_and_queued' : 'queued',
      warning: processingWarning,
    },
    { status: 201 }
  );
}
