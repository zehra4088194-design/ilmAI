import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { ProtectedResourceKind } from '@/lib/resources/server';

export const runtime = 'nodejs';

const resourceKindSchema = z.enum(['library', 'past-paper', 'college-resource']);

const createCommentSchema = z.object({
  resourceKind: resourceKindSchema,
  resourceId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(2).max(1200),
});

function normalizeKind(value: string | null): ProtectedResourceKind | null {
  const parsed = resourceKindSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: NextRequest) {
  const resourceKind = normalizeKind(req.nextUrl.searchParams.get('resourceKind'));
  const resourceId = req.nextUrl.searchParams.get('resourceId');
  if (!resourceKind || !resourceId || !z.string().uuid().safeParse(resourceId).success) {
    return NextResponse.json({ error: 'Invalid resource.' }, { status: 400 });
  }

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from('resource_comments')
    .select('id, resource_kind, resource_id, parent_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url)')
    .eq('resource_kind', resourceKind)
    .eq('resource_id', resourceId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 });

  const parsed = createCommentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Comment is invalid.' }, { status: 400 });

  const { data, error } = await (supabase.from('resource_comments') as any)
    .insert({
      resource_kind: parsed.data.resourceKind,
      resource_id: parsed.data.resourceId,
      parent_id: parsed.data.parentId || null,
      user_id: user.id,
      body: parsed.data.body,
    })
    .select('id, resource_kind, resource_id, parent_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
