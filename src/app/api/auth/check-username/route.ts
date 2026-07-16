import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/i;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase() || '';
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, error: 'Username 3-30 chars aur sirf letters, numbers, dot, underscore ho.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data } = await admin.from('profiles').select('id').ilike('username', username).maybeSingle();
  return NextResponse.json({ available: !data });
}
