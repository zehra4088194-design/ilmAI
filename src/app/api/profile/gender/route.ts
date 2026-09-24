import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required.' }, { status: 401 });

  const { gender } = await req.json();
  if (gender !== 'girl' && gender !== 'boy') {
    return NextResponse.json({ status: 'error', error: 'Select a gender.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, gender, gender_changed_at')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'student') {
    return NextResponse.json({ status: 'error', error: 'This setting is available only to student accounts.' }, { status: 403 });
  }
  if (profile.gender === gender) {
    return NextResponse.json({ status: 'success', data: { gender, genderChangedAt: profile.gender_changed_at } });
  }

  const changedAt = profile.gender_changed_at ? new Date(profile.gender_changed_at).getTime() : 0;
  const nextChangeAt = changedAt + WEEK_MS;
  if (changedAt && nextChangeAt > Date.now()) {
    return NextResponse.json(
      {
        status: 'error',
        error: `Gender can be changed after ${new Date(nextChangeAt).toLocaleString('en-PK')}.`,
        nextChangeAt: new Date(nextChangeAt).toISOString(),
      },
      { status: 429 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('profiles').update({ gender, gender_changed_at: now }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 400 });
  }
  return NextResponse.json({ status: 'success', data: { gender, genderChangedAt: now } });
}
