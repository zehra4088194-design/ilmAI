import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/i;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase() || '';
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, error: 'Usernames must be 3-30 characters and contain only letters, numbers, dots, or underscores.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data } = await admin.from('profiles').select('id').ilike('username', username).maybeSingle();
  return NextResponse.json({ available: !data });
}
