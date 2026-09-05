import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { decodeSessionIdFromJwt, enforceSessionLimit } from '@/lib/auth/enforceSessionLimit';

const attemptSchema = z.object({ success: z.boolean() });

// Records the outcome of a switch attempt via the security-definer RPC (the only path allowed to
// touch failed_attempts/locked_until/last_switched_at — see the migration).
//
// Called TWICE by the client depending on outcome, and in each case runs authenticated as whoever
// the ACTIVE session belongs to at that moment, which the RPC's own party-check still authorizes:
//   - On a wrong password: the sign-in attempt failed, so the session never changed — this still
//     runs as the ORIGINAL (switching-from) account.
//   - On success: signInWithPassword() already replaced the session cookie by the time this is
//     called, so this runs as the TARGET (switched-to) account — which is why enforceSessionLimit
//     is also applied here, exactly like /api/auth/post-login-destination does after any other
//     kind of fresh sign-in.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const parsed = attemptSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ status: 'error', error: 'Invalid request.' }, { status: 400 });
  }

  const { error } = await (supabase.rpc as any)('linked_accounts_record_switch_attempt', {
    p_link_id: id,
    p_success: parsed.data.success,
  });
  if (error) {
    return NextResponse.json({ status: 'error', error: 'Could not record this attempt.' }, { status: 500 });
  }

  if (parsed.data.success) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const sessionId = session?.access_token ? decodeSessionIdFromJwt(session.access_token) : null;
    await enforceSessionLimit(user.id, sessionId);
  }

  return NextResponse.json({ status: 'success' });
}
