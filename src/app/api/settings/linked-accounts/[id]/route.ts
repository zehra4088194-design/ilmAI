import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

// "Prepare switch": confirms the caller may switch to this linked account right now (not locked
// out, not a principal on either side — the row's denormalized role snapshot is DISPLAY-ONLY and
// re-checked live here since either side's role could have changed after the row was created),
// and reveals the target's real email for the browser to use with signInWithPassword(). The real
// email is never persisted client-side beyond that immediate use.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const admin = (await createAdminClient()) as any;
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (callerProfile?.role === 'principal') {
    return NextResponse.json({ status: 'error', error: 'Principal accounts cannot use Switch Profile.' }, { status: 403 });
  }

  const { data: row } = await (supabase as any).from('linked_accounts').select('*').eq('id', id).maybeSingle();
  if (!row || (row.owner_profile_id !== user.id && row.linked_profile_id !== user.id)) {
    return NextResponse.json({ status: 'error', error: 'Linked account not found.' }, { status: 404 });
  }

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    const minutesLeft = Math.max(1, Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000));
    return NextResponse.json(
      { status: 'error', error: `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.` },
      { status: 429 }
    );
  }

  const targetId = row.owner_profile_id === user.id ? row.linked_profile_id : row.owner_profile_id;
  const { data: target } = await admin.from('profiles').select('id, email, role').eq('id', targetId).single();
  if (!target) return NextResponse.json({ status: 'error', error: 'Linked account no longer exists.' }, { status: 404 });
  if (target.role === 'principal') {
    return NextResponse.json(
      { status: 'error', error: 'This account can no longer be switched to.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ status: 'success', data: { email: target.email } });
}
