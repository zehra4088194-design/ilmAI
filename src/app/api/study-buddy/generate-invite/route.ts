import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

// Phase 5a — same invite-code pattern as /api/parent/generate-invite, applied to a symmetric
// student<->student "buddy" link instead of a directional parent<->student one.
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = (await createAdminClient()) as any;
    const code = `BUDDY-${nanoid(6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await admin.from('buddy_links').insert({
      requester_id: user.id,
      status: 'pending',
      invite_code: code,
      invite_expires_at: expiresAt,
    });
    if (error) throw error;

    return NextResponse.json({ status: 'success', data: { code, expiresAt } });
  } catch (error) {
    console.error('Generate buddy invite error:', error);
    return NextResponse.json({ status: 'error', error: 'The invite could not be generated.' }, { status: 500 });
  }
}
