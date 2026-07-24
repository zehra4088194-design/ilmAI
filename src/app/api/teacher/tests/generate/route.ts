import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateChapterQuestionPaper } from '@/lib/tests/chapter-question-bank';

export const runtime = 'nodejs';
export const maxDuration = 90;

function count(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 0), max) : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || !['teacher', 'admin'].includes(String((profile as any).role))) {
      return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.subjectId || !body.chapterId) {
      return NextResponse.json({ error: 'Select a subject and chapter.' }, { status: 400 });
    }
    const mcqCount = count(body.mcqCount, 10, 30);
    const shortCount = count(body.shortCount, 5, 15);
    const longCount = count(body.longCount, 2, 8);
    const paper = await generateChapterQuestionPaper({
      subjectId: body.subjectId,
      chapterId: body.chapterId,
      mcqCount,
      shortCount,
      longCount,
    });
    if (!paper.mcqs.length && !paper.shortQuestions.length && !paper.longQuestions.length) {
      return NextResponse.json({ error: 'No uploaded source questions are available for this chapter yet.' }, { status: 409 });
    }

    const totalMarks =
      paper.mcqs.length +
      paper.shortQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.longQuestions.reduce((sum, question) => sum + question.marks, 0);

    return NextResponse.json({
      data: {
        ...paper,
        institutionName: String(body.institutionName || '').trim().slice(0, 100),
        title: String(body.title || 'Chapter Assessment').trim().slice(0, 120),
        timeAllowed: count(body.timeAllowed, 45, 240),
        totalMarks,
        includeAnswerKey: body.includeAnswerKey !== false,
        paperTheme: body.paperTheme === 'dark' ? 'dark' : 'light',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Teacher test generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The test could not be generated.' },
      { status: 500 }
    );
  }
}
