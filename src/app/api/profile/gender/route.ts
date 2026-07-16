import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai.' }, { status: 401 });

  const { gender } = await req.json();
  if (gender !== 'girl' && gender !== 'boy') {
    return NextResponse.json({ status: 'error', error: 'Girl ya boy select karo.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, gender, gender_changed_at')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'student') {
    return NextResponse.json({ status: 'error', error: 'Ye setting sirf student account ke liye hai.' }, { status: 403 });
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
        error: `Gender ${new Date(nextChangeAt).toLocaleString('en-PK')} ke baad change ho sakta hai.`,
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
