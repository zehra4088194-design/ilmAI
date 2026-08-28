import { createAdminClient } from '@/lib/supabase/server';

const MAX_SESSIONS_PER_ACCOUNT = 2;

// The JWT's `session_id` claim maps 1:1 to auth.sessions.id — decoding it here (rather than an
// extra Supabase call) is the only way to know which session this device's login just became, so
// enforceSessionLimit can exclude it from deletion. No signature verification needed: by the time
// callers have an access_token to pass in, it already passed Supabase's own verification (via
// exchangeCodeForSession or getUser()) — the worst a forged payload could do is name the wrong
// session id to exclude, not bypass auth.
export function decodeSessionIdFromJwt(accessToken: string): string | null {
  try {
    const payloadSegment = accessToken.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { session_id?: string };
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}

// Caps concurrent devices per account at MAX_SESSIONS_PER_ACCOUNT (see the
// public.enforce_session_limit Postgres function — deletes the oldest auth.sessions rows beyond
// the cap, which immediately invalidates those devices' refresh tokens). Called from both
// /api/auth/post-login-destination (password login, magic-link OTP entry) and /api/auth/callback
// (Google OAuth, clicking the magic-link email itself) — those are the only two places a fresh
// session is guaranteed to exist right after sign-in. Failures are logged, never thrown — a hiccup
// enforcing the device cap must never block someone from actually logging in.
export async function enforceSessionLimit(userId: string, currentSessionId: string | null) {
  if (!currentSessionId) return;
  try {
    const admin = (await createAdminClient()) as any;
    await admin.rpc('enforce_session_limit', {
      p_user_id: userId,
      p_current_session_id: currentSessionId,
      p_max_sessions: MAX_SESSIONS_PER_ACCOUNT,
    });
  } catch (error) {
    console.error('[enforceSessionLimit] failed:', error);
  }
}
