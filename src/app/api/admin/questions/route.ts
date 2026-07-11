import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

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
    .from('questions')
    .select('*, subjects(name), chapters(name), topics(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('questions load error:', error);
    return NextResponse.json({ error: 'Questions load nahi hue' }, { status: 500 });
  }

  const questions = (data || []).map((question) => ({
    ...question,
    subject_name: (question.subjects as any)?.name ?? null,
    chapter_name: (question.chapters as any)?.name ?? null,
    topic_name: (question.topics as any)?.name ?? null,
  }));

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    subject_id?: string;
    chapter_id?: string;
    topic_id?: string | null;
    type?: 'MCQ' | 'SHORT' | 'LONG';
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
    text?: string;
    options?: Array<{ id: string; text: string }>;
    correct_answer?: unknown;
    explanation?: string | null;
    marks?: number;
    board?: string | null;
    year?: number | null;
    is_demo_eligible?: boolean;
  };

  if (!body.subject_id || !body.chapter_id || !body.text?.trim()) {
    return NextResponse.json({ error: 'Subject, chapter aur question text zaroori hain' }, { status: 400 });
  }

  const type = body.type || 'MCQ';
  if (type === 'MCQ' && (!body.options?.length || !body.correct_answer)) {
    return NextResponse.json({ error: 'MCQ ke liye options aur correct answer zaroori hain' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('questions')
    .insert({
      subject_id: body.subject_id,
      chapter_id: body.chapter_id,
      topic_id: body.topic_id || null,
      type,
      difficulty: body.difficulty || 'MEDIUM',
      text: body.text.trim(),
      options: type === 'MCQ' ? body.options || [] : null,
      correct_answer: body.correct_answer || '',
      explanation: body.explanation || null,
      marks: body.marks || (type === 'MCQ' ? 1 : 2),
      board: body.board || null,
      year: body.year || null,
      is_verified: true,
      is_demo_eligible: body.is_demo_eligible === true,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('question create error:', error);
    return NextResponse.json({ error: 'Question add nahi hua' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ question: data }, { status: 201 });
}
