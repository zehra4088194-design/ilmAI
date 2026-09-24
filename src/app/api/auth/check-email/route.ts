import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used by RegisterForm right before signUp() so a person whose email already has an
// account (including one an admin pre-created for them via an institution invite,
// before they ever visited /register themselves) gets told to log in instead of
// silently going through signup again — see [[register-membership-redirect-fix]].
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() || '';
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ available: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  return NextResponse.json({ available: !data });
}
