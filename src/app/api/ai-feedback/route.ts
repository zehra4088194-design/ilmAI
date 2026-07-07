import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

const VALID_SOURCE_TYPES = [
  'doubt_reply',
  'ai_tutor_message',
  'quiz_explanation',
  'full_test_feedback',
  'routine_explanation',
  'guess_paper_explanation',
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

    const { sourceType, sourceId, isHelpful } = await req.json();
    if (!VALID_SOURCE_TYPES.includes(sourceType) || !sourceId || typeof isHelpful !== 'boolean') {
      return NextResponse.json({ status: 'error', error: 'Invalid feedback payload' }, { status: 400 });
    }

    const { error } = await supabase.from('ai_answer_feedback').upsert(
      {
        id: nanoid(),
        user_id: user.id,
        source_type: sourceType,
        source_id: String(sourceId),
        is_helpful: isHelpful,
      },
      { onConflict: 'user_id,source_type,source_id' }
    );
    if (error) throw error;

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('AI feedback error:', error);
    return NextResponse.json({ status: 'error', error: 'Kuch ghalat ho gaya' }, { status: 500 });
  }
}
