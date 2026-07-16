import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required hai' }, { status: 401 });

  const metadata = user.user_metadata || {};
  const role = metadata.role === 'parent' ? 'parent' : 'student';
  const username = typeof metadata.username === 'string' ? metadata.username.trim().toLowerCase() : null;
  const gender = metadata.gender === 'girl' || metadata.gender === 'boy' ? metadata.gender : null;
  const admin = (await createAdminClient()) as any;
  const { data: existing } = await admin.from('profiles').select('id, username').eq('id', user.id).maybeSingle();

  if (!existing) {
    const { error } = await admin.from('profiles').insert({
      id: user.id,
      email: user.email || '',
      full_name: metadata.full_name || user.email?.split('@')[0] || 'Student',
      username,
      gender,
      gender_changed_at: gender ? new Date().toISOString() : null,
      role,
      education_level: metadata.education_level === 'university' ? 'university' : 'school',
      board: metadata.board || null,
      subscription_tier: 'FREE',
      xp: 0,
      level: 1,
      streak: 0,
      total_study_time: 0,
      is_email_verified: Boolean(user.email_confirmed_at),
      is_profile_complete: false,
      onboarding_completed: role !== 'student',
      onboarding_step: 0,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (username && !existing.username) {
    const { error } = await admin.from('profiles').update({ username }).eq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
