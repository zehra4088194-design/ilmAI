import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

/** Phase 7b — get-or-create the current user's own referral code (one per user, reused forever). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: existing } = await db.from('referral_codes').select('code').eq('owner_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ status: 'success', data: { code: existing.code } });

  const code = `ILM-${nanoid(6).toUpperCase()}`;
  const { data: created, error } = await db.from('referral_codes').insert({ owner_id: user.id, code }).select('code').single();
  if (error) return NextResponse.json({ status: 'error', error: 'The referral code could not be created.' }, { status: 500 });

  return NextResponse.json({ status: 'success', data: { code: created.code } });
}
