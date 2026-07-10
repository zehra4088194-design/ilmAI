import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type LibraryUpdate = Database['public']['Tables']['library_resources']['Update'] & {
  resource_type?: 'text_book' | 'notes' | 'other';
  chapter_id?: string | null;
};

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
  if (body.drive_url !== undefined) update.drive_url = body.drive_url.trim();
  if (body.drive_file_id !== undefined) update.drive_file_id = body.drive_file_id;
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url;
  if (body.file_type !== undefined) update.file_type = body.file_type;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Koi field update ke liye nahi diya' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await (adminClient.from('library_resources') as any).update(update).eq('id', id).select().single();

  if (error) {
    console.error('library resource update error:', error);
    return NextResponse.json({ error: 'Resource update nahi hua' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Resource nahi mila' }, { status: 404 });

  return NextResponse.json({ resource: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('library_resources').delete().eq('id', id);

  if (error) {
    console.error('library resource delete error:', error);
    return NextResponse.json({ error: 'Resource delete nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
