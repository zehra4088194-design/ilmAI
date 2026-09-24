import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { listCategories } from '@/lib/ads/queries';

export const runtime = 'nodejs';

const NAME_MAX = 60;

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, NAME_MAX) : '';
  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from('ad_categories').insert({ name });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That category already exists.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ categories: await listCategories() });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from('ad_categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
