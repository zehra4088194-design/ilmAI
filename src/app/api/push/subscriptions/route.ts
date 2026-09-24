import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const MAX_TOKEN_LENGTH = 4096;

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Invalid push token.' }, { status: 400 });
  }

  const admin = (await createAdminClient()) as any;
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      token,
      platform: body.platform === 'android' ? 'android' : 'web',
      user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      enabled: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
  if (error) return NextResponse.json({ error: 'Push subscription could not be saved.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}

export async function DELETE(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = (await createAdminClient()) as any;
  let query = admin.from('push_subscriptions').delete().eq('user_id', user.id);
  if (typeof body.token === 'string' && body.token.trim()) query = query.eq('token', body.token.trim());
  const { error } = await query;
  if (error) return NextResponse.json({ error: 'Push subscription could not be removed.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
