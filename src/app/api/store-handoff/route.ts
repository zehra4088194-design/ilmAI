import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signStoreHandoffToken } from '@/lib/store-handoff';

// GET /api/store-handoff — the "Store" sidebar link points here instead of
// straight at ilmai.store. ilmai.study and ilmai.store run on separate
// Supabase Auth projects (see PROJECT_OVERVIEW.md), so a logged-in user here
// isn't automatically logged in there; this mints a short-lived signed token
// and hands it to ilmai.store's /auth/handoff, which verifies it and signs
// the user into their (linked or newly created) store account. Never
// redirects an anonymous visitor through the token flow — they just go to
// the plain store URL, same as anyone else browsing it.
export async function GET(request: NextRequest) {
  const storeUrl = process.env.STORE_URL || 'https://ilmai.store';
  const next = request.nextUrl.searchParams.get('next');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = new URL('/', storeUrl);
  if (next && next.startsWith('/') && !next.startsWith('//')) destination.pathname = next;

  if (!user || !user.email) {
    return NextResponse.redirect(destination.toString());
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const token = signStoreHandoffToken({
    sub: user.id,
    email: user.email,
    fullName: profile?.full_name || null,
    avatarUrl: profile?.avatar_url || null,
  });

  // STORE_HANDOFF_SECRET not configured yet — fall back to a plain (logged-out) visit
  // rather than erroring, so the link is never worse than "just go to the store."
  if (!token) {
    return NextResponse.redirect(destination.toString());
  }

  const handoffUrl = new URL('/auth/handoff', storeUrl);
  handoffUrl.searchParams.set('token', token);
  if (destination.pathname !== '/') handoffUrl.searchParams.set('next', destination.pathname);
  return NextResponse.redirect(handoffUrl.toString());
}
