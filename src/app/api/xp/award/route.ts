import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { awardXp } from '@/lib/gamification/xp';

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

    const result = await awardXp(user.id, xpToAdd, 'manual_xp_award');

    return NextResponse.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json({ status: 'error', error: 'XP could not be saved.' }, { status: 500 });
  }
}
