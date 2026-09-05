import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient, createEphemeralClient } from '@/lib/supabase/server';
import { maskEmail } from '@/lib/utils/maskEmail';

const linkSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// List the caller's own linked accounts — either side of the pair, RLS already scopes this.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { data, error } = await (supabase as any).from('linked_accounts').select('*');
  if (error) return NextResponse.json({ status: 'error', error: 'Could not load linked accounts.' }, { status: 500 });

  const rows = (data || []).map((row: any) => {
    const iAmOwner = row.owner_profile_id === user.id;
    return {
      id: row.id,
      maskedEmail: iAmOwner ? row.linked_masked_email : row.owner_masked_email,
      role: iAmOwner ? row.linked_role : row.owner_role,
      fullName: iAmOwner ? row.linked_full_name : row.owner_full_name,
      lockedUntil: row.locked_until,
      lastSwitchedAt: row.last_switched_at,
    };
  });
  return NextResponse.json({ status: 'success', data: { linkedAccounts: rows } });
}

// Link another one of the caller's own accounts. The second account's password is verified
// through a throwaway, cookie-less client (createEphemeralClient) so the caller's OWN active
// session is never disturbed by this check — see that helper's comment in
// src/lib/supabase/server.ts for exactly why that's sound.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = (await createAdminClient()) as any;
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, role, email, full_name')
      .eq('id', user.id)
      .single();
    if (!callerProfile) return NextResponse.json({ status: 'error', error: 'Profile not found.' }, { status: 404 });
    if (callerProfile.role === 'principal') {
      return NextResponse.json(
        { status: 'error', error: 'Principal accounts cannot use Switch Profile.' },
        { status: 403 }
      );
    }

    const parsed = linkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ status: 'error', error: 'A valid email and password are required.' }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;

    const GENERIC_ERROR = { status: 'error' as const, error: 'Incorrect email or password.' };

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, role, email, full_name')
      .ilike('email', email)
      .maybeSingle();
    if (!targetProfile || targetProfile.id === user.id || targetProfile.role === 'principal') {
      // Same generic message whether the account doesn't exist, is the caller's own, or is a
      // principal — never reveal which, same normalization LoginForm already does for its own
      // "Invalid login credentials" message.
      return NextResponse.json(GENERIC_ERROR, { status: 401 });
    }

    const ephemeral = createEphemeralClient();
    const { error: signInError } = await ephemeral.auth.signInWithPassword({
      email: targetProfile.email,
      password,
    });
    // The ephemeral client never persists a session and is discarded here — nothing from this
    // sign-in is stored anywhere.
    if (signInError) {
      return NextResponse.json(GENERIC_ERROR, { status: 401 });
    }

    // A relink always starts fresh — safe, since reaching this point again required re-proving
    // the password — and doubles as a way to clear any prior lockout.
    const lo = [callerProfile.id, targetProfile.id].sort();
    await admin
      .from('linked_accounts')
      .delete()
      .or(
        `and(owner_profile_id.eq.${lo[0]},linked_profile_id.eq.${lo[1]}),and(owner_profile_id.eq.${lo[1]},linked_profile_id.eq.${lo[0]})`
      );

    const { data: inserted, error: insertError } = await admin
      .from('linked_accounts')
      .insert({
        owner_profile_id: callerProfile.id,
        linked_profile_id: targetProfile.id,
        owner_masked_email: maskEmail(callerProfile.email),
        owner_role: callerProfile.role,
        owner_full_name: callerProfile.full_name,
        linked_masked_email: maskEmail(targetProfile.email),
        linked_role: targetProfile.role,
        linked_full_name: targetProfile.full_name,
      })
      .select('id')
      .single();
    if (insertError) {
      return NextResponse.json({ status: 'error', error: 'Could not link this account.' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        id: inserted.id,
        maskedEmail: maskEmail(targetProfile.email),
        role: targetProfile.role,
        fullName: targetProfile.full_name,
      },
    });
  } catch (error) {
    console.error('[linked-accounts] link error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not link this account.' }, { status: 500 });
  }
}
