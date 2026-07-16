import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import slugify from 'slugify';

export async function GET(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const chapterId = req.nextUrl.searchParams.get('chapterId');
  if (!chapterId) return NextResponse.json({ error: 'chapterId required hai' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('topics')
    .select('id, name')
    .eq('chapter_id', chapterId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: 'Topics load nahi hue' }, { status: 500 });
  return NextResponse.json({ topics: data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { chapterId, name, content = '' } = (await req.json()) as { chapterId?: string; name?: string; content?: string };
  if (!chapterId || !name?.trim()) {
    return NextResponse.json({ error: 'Chapter aur topic name zaroori hain' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data: existing } = await adminClient
    .from('topics')
    .select('order_index')
    .eq('chapter_id', chapterId)
    .order('order_index', { ascending: false })
    .limit(1);
  const orderIndex = (existing?.[0]?.order_index ?? -1) + 1;
  const slug = `${slugify(name, { lower: true, strict: true })}-${orderIndex}`;

  const { data, error } = await adminClient
    .from('topics')
    .insert({ chapter_id: chapterId, name: name.trim(), slug, content, order_index: orderIndex })
    .select()
    .single();

  if (error) {
    console.error('topic create error:', error);
    return NextResponse.json({ error: 'Topic add nahi hua' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ topic: data }, { status: 201 });
}
