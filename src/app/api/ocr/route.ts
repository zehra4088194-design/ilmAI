import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import slugify from 'slugify';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return null;
  }
  return user;
}

// GET /api/admin/chapters?subjectId=...
// Lists all chapters for a subject, ordered the way students will see them.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const subjectId = req.nextUrl.searchParams.get('subjectId');
  if (!subjectId) return NextResponse.json({ error: 'subjectId required hai' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: 'Chapters load nahi hue' }, { status: 500 });
  return NextResponse.json({ chapters: data });
}

// POST /api/admin/chapters
// body: { subjectId: string, name: string, boards?: string[], orderIndex?: number }
// `boards` empty/omitted = applies to every board the subject supports.
// Pass specific boards (e.g. ['CBSE','ICSE','STATE_BOARD_IN']) to keep this
// chapter scoped to just those boards — this is how Pakistan vs India
// chapters stay separate under a shared subject like Physics.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as { subjectId?: string; name?: string; boards?: string[]; orderIndex?: number };
  const { subjectId, name, boards = [], orderIndex } = body;

  if (!subjectId || !name?.trim()) {
    return NextResponse.json({ error: 'Subject aur chapter ka naam dono zaroori hain' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  // Auto-number this chapter after the current max order_index for this
  // subject+board-scope if the caller didn't specify one.
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
  // order index if a name collides (e.g. two boards both have a chapter
  // literally named "Introduction").
  const slug = `${baseSlug}-${finalOrderIndex}`;

  const { data, error } = await adminClient
    .from('chapters')
    .insert({
      subject_id: subjectId,
      name: name.trim(),
      slug,
      boards,
      order_index: finalOrderIndex,
    })
    .select()
    .single();

  if (error) {
    console.error('chapter create error:', error);
    return NextResponse.json({ error: 'Chapter add nahi hua' }, { status: 500 });
  }

  // Keep subjects.total_chapters roughly in sync for the admin overview cards.
  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ chapter: data });
}
