import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateAndSaveConceptsForChapter } from '@/lib/learning/concepts';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH_SIZE = 5;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = createServiceClient() as any;
  try {
    const { data: coveredRows } = await db.from('curriculum_concepts').select('chapter_id');
    const coveredChapterIds = new Set((coveredRows || []).map((row: any) => row.chapter_id));

    const { data: chapters } = await db
      .from('chapters')
      .select('id, name, subject_id, boards, grade_levels')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(500);
    const pending = (chapters || []).filter((chapter: any) => !coveredChapterIds.has(chapter.id)).slice(0, BATCH_SIZE);
    if (!pending.length) return NextResponse.json({ status: 'success', processed: 0, remaining: 0 });

    const subjectIds = [...new Set(pending.map((chapter: any) => chapter.subject_id))];
    const { data: subjects } = await db.from('subjects').select('id, name').in('id', subjectIds);
    const subjectById = new Map<string, { id: string; name: string }>(
      (subjects || []).map((subject: any) => [subject.id, subject])
    );

    const results = [];
    for (const chapter of pending) {
      const subject = subjectById.get(chapter.subject_id);
      if (!subject) continue;
      try {
        const outcome = await generateAndSaveConceptsForChapter(db, chapter, subject);
        results.push({ chapterId: chapter.id, ...outcome });
      } catch (error) {
        results.push({ chapterId: chapter.id, error: error instanceof Error ? error.message : 'Generation failed' });
      }
    }
    return NextResponse.json({ status: 'success', processed: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Curriculum concept backfill failed' },
      { status: 500 }
    );
  }
}
