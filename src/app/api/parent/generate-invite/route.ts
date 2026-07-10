import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = await createAdminClient();
    const code = `SV-${nanoid(6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await admin.from('profiles').update({ role: 'parent' }).eq('id', user.id);

    const { error } = await (admin.from('parent_student_links') as any).insert({
      id: crypto.randomUUID(),
      parent_id: user.id,
      student_id: null,
      status: 'pending',
      invite_code: code,
      invite_expires_at: expiresAt,
    });

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      data: { code, expiresAt },
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    return NextResponse.json({ status: 'error', error: 'Invite generate nahi hua' }, { status: 500 });
  }
}
