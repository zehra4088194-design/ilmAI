import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { tagQuestionsWithConcepts } from '@/lib/learning/concepts';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CHAPTER_BATCH_SIZE = 5;
const QUESTIONS_PER_CHAPTER = 100;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = createServiceClient() as any;
  try {
    const { data: readyRows } = await db.from('curriculum_concepts').select('chapter_id');
    const readyChapterIds = [...new Set((readyRows || []).map((row: any) => row.chapter_id))];
    if (!readyChapterIds.length) return NextResponse.json({ status: 'success', processed: 0 });

    const { data: untaggedQuestions } = await db
      .from('questions')
      .select('id, text, chapter_id')
      .in('chapter_id', readyChapterIds)
      .is('concept_id', null)
      .limit(QUESTIONS_PER_CHAPTER * CHAPTER_BATCH_SIZE);

    const byChapter = new Map<string, { id: string; text: string }[]>();
    for (const question of untaggedQuestions || []) {
      const list = byChapter.get(question.chapter_id) || [];
      if (list.length < QUESTIONS_PER_CHAPTER) list.push({ id: question.id, text: question.text || '' });
      byChapter.set(question.chapter_id, list);
    }
    const chapterIds = [...byChapter.keys()].slice(0, CHAPTER_BATCH_SIZE);
    if (!chapterIds.length) return NextResponse.json({ status: 'success', processed: 0 });

    const results = [];
    for (const chapterId of chapterIds) {
      try {
        const outcome = await tagQuestionsWithConcepts(db, chapterId, byChapter.get(chapterId) || []);
        results.push({ chapterId, ...outcome });
      } catch (error) {
        results.push({ chapterId, error: error instanceof Error ? error.message : 'Tagging failed' });
      }
    }
    const processed = results.reduce((sum, r: any) => sum + (r.tagged || 0), 0);
    return NextResponse.json({ status: 'success', processed, results });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Question concept tagging failed' },
      { status: 500 }
    );
  }
}
