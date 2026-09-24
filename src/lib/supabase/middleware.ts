import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function updateSession(request: NextRequest, forwardedHeaders?: Headers) {
  const createResponse = () =>
    forwardedHeaders ? NextResponse.next({ request: { headers: forwardedHeaders } }) : NextResponse.next({ request });
  let supabaseResponse = createResponse();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = createResponse();
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin accounts always stay on ELITE, lifetime (no expiry) — checked/self-healed
  // on every request so it never depends on a payment ever having happened.
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single();

    if (profile && (profile.subscription_tier !== 'ELITE' || profile.subscription_expires_at !== null)) {
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'ELITE', subscription_expires_at: null })
        .eq('id', user.id);
    }
  }

  return { user, response: supabaseResponse, supabase };
}
