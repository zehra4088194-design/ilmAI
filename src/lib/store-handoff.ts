import { createHmac, timingSafeEqual } from 'crypto';

// Short-lived, HMAC-signed handoff token that lets a logged-in ilm AI Study
// user land on ilmai.store already signed in — the two apps use separate
// Supabase Auth projects (see PROJECT_OVERVIEW.md's ilmai.store note), so
// there is no shared session cookie to piggyback on; this is the bridge.
// Mirrored verifier lives at ilmai-store's src/lib/auth/handoff.ts — the
// payload shape and signing scheme must stay byte-for-byte identical between
// the two, and STORE_HANDOFF_SECRET must be the same value on both deploys.
const TOKEN_TTL_MS = 2 * 60 * 1000;

export type StoreHandoffPayload = {
  sub: string; // this app's auth.users.id — the cross-link key (profiles.ilmai_study_user_id on the store side)
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  iat: number;
  exp: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string, secret: string) {
  return createHmac('sha256', secret).update(payloadB64).digest('hex');
}

export function signStoreHandoffToken(
  input: Pick<StoreHandoffPayload, 'sub' | 'email' | 'fullName' | 'avatarUrl'>
): string | null {
  const secret = process.env.STORE_HANDOFF_SECRET;
  if (!secret) return null;

  const now = Date.now();
  const payload: StoreHandoffPayload = {
    ...input,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/** Only used by tests/debugging on this side — the store does the real verification. */
export function verifyStoreHandoffTokenLocally(token: string): StoreHandoffPayload | null {
  const secret = process.env.STORE_HANDOFF_SECRET;
  if (!secret) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as StoreHandoffPayload;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
