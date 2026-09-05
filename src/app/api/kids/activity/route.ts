import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logKidsActivityServer } from '@/lib/kids/logActivityServer';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { category, activityKey, xp } = await req.json();
  if (!category || !activityKey) {
    return NextResponse.json({ error: 'A category and activity key are required' }, { status: 400 });
  }

  const result = await logKidsActivityServer(user.id, category, activityKey, xp);

  const admin = await createAdminClient();
  const { data: profile } = await admin.from('profiles').select('streak').eq('id', user.id).maybeSingle();

  return NextResponse.json({
    status: 'success',
    xp: result.xp,
    level: result.level,
    streak: profile?.streak || 0,
  });
}
