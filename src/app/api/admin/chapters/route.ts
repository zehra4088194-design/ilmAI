import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import type { Database } from '@/lib/supabase/database.types';
import slugify from 'slugify';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];

// GET /api/admin/chapters?subjectId=...
// Lists all chapters for a subject, ordered the way students will see them.
export async function GET(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const subjectId = req.nextUrl.searchParams.get('subjectId');
  if (!subjectId) return NextResponse.json({ error: 'A subject ID is required' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: 'Chapters could not be loaded' }, { status: 500 });
  return NextResponse.json({ chapters: data });
}

// POST /api/admin/chapters
// body: { subjectId: string, name: string, boards?: string[], gradeLevels?: string[], orderIndex?: number }
// `boards`/`gradeLevels` empty/omitted = applies to every board/class the subject supports.
// Pass specific boards (e.g. ['CBSE','ICSE','STATE_BOARD_IN']) to keep this
// chapter scoped to just those boards — this is how Pakistan vs India
// chapters stay separate under a shared subject like Physics.
export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { subjectId?: string; name?: string; boards?: string[]; gradeLevels?: string[]; orderIndex?: number };
  const { subjectId, name, boards = [], gradeLevels = [], orderIndex } = body;

  if (!subjectId || !name?.trim()) {
    return NextResponse.json({ error: 'Subject and chapter names are required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Auto-number this chapter after the current max order_index for this
  // subject if the caller didn't specify one.
  let finalOrderIndex = orderIndex;
  if (finalOrderIndex === undefined) {
    const { data: existing } = await adminClient
      .from('chapters')
      .select('order_index')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: false })
      .limit(1);
    finalOrderIndex = (existing?.[0]?.order_index ?? -1) + 1;
  }

  const baseSlug = slugify(name, { lower: true, strict: true });
  // Chapters have a unique(subject_id, slug) constraint — suffix with the
  // order index so two boards can both have a chapter literally named
  // "Introduction" under the same subject without colliding.
  const slug = `${baseSlug}-${finalOrderIndex}`;

  const { data, error } = await adminClient
    .from('chapters')
    .insert({
      subject_id: subjectId,
      name: name.trim(),
      slug,
      boards: boards as BoardType[],
      grade_levels: gradeLevels as GradeLevel[],
      order_index: finalOrderIndex,
    })
    .select()
    .single();

  if (error) {
    console.error('chapter create error:', error);
    return NextResponse.json({ error: 'The chapter could not be added' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ chapter: data });
}
