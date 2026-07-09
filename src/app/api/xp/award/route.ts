import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    const { amount } = await req.json();
    const xpToAdd = Math.min(Math.max(Math.floor(Number(amount) || 0), 0), 100);
    if (xpToAdd <= 0) {
      return NextResponse.json({ status: 'success', data: { awarded: 0 } });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: 'error', error: 'Profile nahi mila' }, { status: 404 });
    }

    const nextXp = (profile.xp || 0) + xpToAdd;
    const nextLevel = Math.floor(nextXp / 1000) + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ xp: nextXp, level: nextLevel })
      .eq('id', user.id);

    if (error) {
      console.error('XP award failed:', error);
      return NextResponse.json({ status: 'error', error: 'XP save nahi ho saka' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      data: { awarded: xpToAdd, xp: nextXp, level: nextLevel },
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json({ status: 'error', error: 'XP save nahi ho saka' }, { status: 500 });
  }
}
