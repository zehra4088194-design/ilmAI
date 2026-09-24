import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeQuizSession } from '@/lib/quiz/complete';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    const session = await req.json();
    const result = await completeQuizSession(supabase, user.id, session, session?.clientIdempotencyKey || null);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Quiz completion error:', error);
    return NextResponse.json({ status: 'error', error: 'The quiz result could not be saved.' }, { status: 500 });
  }
}
