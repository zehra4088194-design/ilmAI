import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuizViaGateway } from '@/lib/ai/gateway';
import { checkQuizLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const limitCheck = await checkQuizLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ke quizzes khatam ho gaye. Pro plan lo unlimited quizzes ke liye!' }, { status: 429 });
    }

    const { subjectId, chapterIds, count = 10, difficulty = 'MEDIUM' } = await req.json();
    if (!subjectId || !chapterIds?.length) {
      return NextResponse.json({ status: 'error', error: 'Subject aur chapters required hain' }, { status: 400 });
    }

    const { data: existingQuestions } = await supabase
      .from('questions').select('*').eq('subject_id', subjectId).in('chapter_id', chapterIds)
      .eq('type', 'MCQ').eq('is_verified', true).limit(count);

    let questions = existingQuestions || [];

    if (questions.length < count) {
      const needed = count - questions.length;
      // Free tier uses Groq mini; Pro/Elite get Groq medium for better quiz quality (still free pool)
      const aiResult = await generateQuizViaGateway({ subjectId, chapterIds, count: needed, difficulty, provider: 'groq', tier: tier === 'FREE' ? 'mini' : 'medium' });
      try {
        const cleaned = aiResult.replace(/```json|```/g, '').trim();
        const aiQuestions = JSON.parse(cleaned);
        const formatted = aiQuestions.map((q: { text: string; options: unknown; correctAnswer: string; explanation: string; difficulty: string; marks: number }) => ({
          id: nanoid(), topic_id: null, chapter_id: chapterIds[0], subject_id: subjectId, type: 'MCQ',
          difficulty: q.difficulty || difficulty, text: q.text, options: q.options, correct_answer: q.correctAnswer,
          explanation: q.explanation, marks: q.marks || 1, is_verified: false, times_attempted: 0, correct_rate: 0,
          created_at: new Date().toISOString(),
        }));
        questions = [...questions, ...formatted];
      } catch (parseError) {
        console.error('Failed to parse AI quiz response:', parseError);
      }
    }

    const session = {
      id: nanoid(), userId: user.id, subjectId, chapterIds, questions: questions.slice(0, count),
      currentIndex: 0, answers: {}, startedAt: new Date().toISOString(), timeSpent: 0, status: 'IN_PROGRESS',
      totalMarks: questions.slice(0, count).reduce((sum: number, q: { marks: number }) => sum + (q.marks || 1), 0),
      correctCount: 0, incorrectCount: 0, skippedCount: 0, mode: 'PRACTICE',
    };

    return NextResponse.json({ status: 'success', data: session });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ status: 'error', error: 'Quiz generate nahi ho saka' }, { status: 500 });
  }
}
