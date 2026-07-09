import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type PastPaperUpdate = Database['public']['Tables']['past_papers']['Update'] & { download_count?: number };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as PastPaperUpdate;
  const update: Database['public']['Tables']['past_papers']['Update'] = {};

  if (body.subject_id !== undefined) update.subject_id = body.subject_id;
  if (body.board !== undefined) update.board = body.board;
  if (body.year !== undefined) update.year = Number(body.year);
  if (body.paper_type !== undefined) update.paper_type = body.paper_type;
  if (body.file_url !== undefined) update.file_url = body.file_url.trim();
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url;
  if (body.total_questions !== undefined) update.total_questions = body.total_questions;
  if (body.duration !== undefined) update.duration = body.duration;
  if (body.is_verified !== undefined) update.is_verified = body.is_verified;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Koi field update ke liye nahi diya' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('past_papers').update(update).eq('id', id).select().single();

  if (error) {
    console.error('past paper update error:', error);
    return NextResponse.json({ error: 'Past paper update nahi hua' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Past paper nahi mila' }, { status: 404 });

  return NextResponse.json({ paper: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('past_papers').delete().eq('id', id);

  if (error) {
    console.error('past paper delete error:', error);
    return NextResponse.json({ error: 'Past paper delete nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
