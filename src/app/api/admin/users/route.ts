import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

// GET /api/admin/users?q=search-email-name-or-username
export async function GET(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const safeQuery = q.replace(/[,%()]/g, ' ');
  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase admin client missing' },
      { status: 500 }
    );
  }

  let query = adminClient
    .from('profiles')
    .select(
      'id, full_name, email, username, sponsored_institution_name, sponsored_institution_type, subscription_tier, subscription_expires_at, xp, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (safeQuery) {
    query = query.or(
      `email.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%,username.ilike.%${safeQuery}%,sponsored_institution_name.ilike.%${safeQuery}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Users load nahi hue: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}
