import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type LectureInsert = Database['public']['Tables']['lectures']['Insert'];
type ChapterJoin = { name: string | null; subject_id: string | null } | null;
type TopicJoin = { name: string | null } | null;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('lectures')
    .select('*, chapters(name, subject_id), topics(name)')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Lectures load nahi hue' }, { status: 500 });

  const lectures = (data ?? []).map((lecture) => {
    const chapters = lecture.chapters as ChapterJoin;
    const topics = lecture.topics as TopicJoin;
    return {
      ...lecture,
      subject_id: chapters?.subject_id ?? null,
      chapter_name: chapters?.name ?? null,
      topic_name: topics?.name ?? null,
    };
  });

  return NextResponse.json({ lectures });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as LectureInsert;
  if (!body.chapter_id || !body.title?.trim() || !body.youtube_url?.trim()) {
    return NextResponse.json({ error: 'Chapter, title aur YouTube URL zaroori hain' }, { status: 400 });
  }
  if (body.kind === 'exercise_walkthrough' && !body.exercise_number?.trim()) {
    return NextResponse.json({ error: 'Exercise walkthrough ke liye exercise number zaroori hai' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('lectures')
    .insert({
      chapter_id: body.chapter_id,
      topic_id: body.topic_id ?? null,
      title: body.title.trim(),
      youtube_url: body.youtube_url.trim(),
      thumbnail_url: body.thumbnail_url ?? null,
      kind: body.kind ?? 'lecture',
      exercise_number: body.kind === 'exercise_walkthrough' ? body.exercise_number?.trim() ?? null : null,
      order_index: body.order_index ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('lecture create error:', error);
    return NextResponse.json({ error: 'Lecture add nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ lecture: data }, { status: 201 });
}
