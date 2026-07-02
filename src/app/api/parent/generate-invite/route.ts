import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const code = `SV-${nanoid(6).toUpperCase()}`;
    // Store code in notifications table temporarily (reusing existing infra)
    // In production you would have a dedicated invite_codes table
    await supabase.from('notifications').insert({
      id: nanoid(),
      user_id: user.id,
      type: 'SYSTEM',
      title: `PARENT_INVITE:${code}`,
      message: user.id,
      is_read: false,
    });

    return NextResponse.json({
      status: 'success',
      data: { code, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ status: 'error', error: 'Invite generate nahi hua' }, { status: 500 });
  }
}
