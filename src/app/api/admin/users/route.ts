import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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

// GET /api/admin/users?q=search-email-or-name
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const adminClient = await createAdminClient();

  let query = adminClient
    .from('profiles')
    .select('id, full_name, email, subscription_tier, subscription_expires_at, xp, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Users load nahi hue' }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}
