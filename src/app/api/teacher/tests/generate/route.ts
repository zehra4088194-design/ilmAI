import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateChapterQuestionPaper } from '@/lib/tests/chapter-question-bank';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';
import { resolveTestBranding, type PlanTier } from '@/lib/teacher/test-branding';
import type { DifficultyFilter } from '@/lib/tests/paper-selection';

export const runtime = 'nodejs';
export const maxDuration = 90;

const VALID_DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'MIXED']);
const VALID_THEMES = new Set(['classic', 'modern', 'minimal']);

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_tier, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !(await isTeacherAuthorized(supabase, user.id))) {
      return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });
    }
    const planTier = (
      ['PRO', 'ELITE'].includes(String((profile as any).subscription_tier))
        ? (profile as any).subscription_tier
        : 'FREE'
    ) as PlanTier;

    const body = await req.json();
    if (!body.gradeLevel || !body.subjectId || !body.chapterId) {
      return NextResponse.json({ error: 'Select a class, subject, and chapter.' }, { status: 400 });
    }

    const branding = resolveTestBranding(planTier, {
      customHeader: body.customHeader,
      customWatermarkText: body.customWatermarkText,
      customWatermarkImageUrl: body.customWatermarkImageUrl,
      hidePlatformBranding: body.hidePlatformBranding,
    });

    // FREE teachers must trigger the ad flow client-side first; the client
    // sends adAcknowledged once the house ad banner has been shown/interacted with.
    if (branding.requiresAdGate && body.adAcknowledged !== true) {
      return NextResponse.json(
        { error: 'AD_REQUIRED', message: 'Watch the ad to generate a free test paper.' },
        { status: 402 }
      );
    }

    const mcqCount = count(body.mcqCount, 10, 100);
    const shortCount = count(body.shortCount, 5, 50);
    const longCount = count(body.longCount, 2, 20);
    const difficultyRaw = String(body.difficulty || '').toUpperCase();
    const difficulty: DifficultyFilter = VALID_DIFFICULTIES.has(difficultyRaw)
      ? (difficultyRaw as DifficultyFilter)
      : undefined;
    const theme = VALID_THEMES.has(String(body.theme)) ? String(body.theme) : 'classic';

    const paper = await generateChapterQuestionPaper({
      subjectId: body.subjectId,
      chapterId: body.chapterId,
      gradeLevel: String(body.gradeLevel).slice(0, 30),
      mcqCount,
      shortCount,
      longCount,
      difficulty,
    });
    if (!paper.mcqs.length && !paper.shortQuestions.length && !paper.longQuestions.length) {
      return NextResponse.json(
        { error: 'No uploaded source questions are available for this chapter yet.' },
        { status: 409 }
      );
    }

    const totalMarks =
      paper.mcqs.length +
      paper.shortQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.longQuestions.reduce((sum, question) => sum + question.marks, 0);

    const institutionName =
      planTier === 'ELITE' && branding.customHeader
        ? branding.customHeader
        : String(body.institutionName || '')
            .trim()
            .slice(0, 100);
    const title = String(body.title || 'Chapter Assessment')
      .trim()
      .slice(0, 120);
    const timeAllowed = count(body.timeAllowed, 45, 240);
    const includeAnswerKey = body.includeAnswerKey !== false;

    const responseData = {
      ...paper,
      institutionName,
      title,
      timeAllowed,
      totalMarks,
      includeAnswerKey,
      theme,
      difficulty: difficulty || 'MIXED',
      planTier,
      branding,
      generatedAt: new Date().toISOString(),
      requestedCounts: { mcq: mcqCount, short: shortCount, long: longCount },
    };

    // Persist the paper so the teacher can revisit it later. Best-effort:
    // a storage failure should never block the teacher from getting their paper.
    let testId: string | null = null;
    try {
      const db = createServiceClient();
      const { data: inserted, error: insertError } = await (db.from('teacher_generated_tests') as any)
        .insert({
          created_by: user.id,
          subject_id: body.subjectId,
          chapter_id: body.chapterId,
          grade_level: String(body.gradeLevel).slice(0, 30),
          title,
          institution_name: institutionName || null,
          theme,
          difficulty: difficulty || 'MIXED',
          mcq_count: paper.mcqs.length,
          short_count: paper.shortQuestions.length,
          long_count: paper.longQuestions.length,
          total_marks: totalMarks,
          duration_minutes: timeAllowed,
          include_answer_key: includeAnswerKey,
          plan_tier: planTier,
          custom_header: branding.customHeader,
          custom_watermark_text: branding.customWatermarkText,
          custom_watermark_image_url: branding.customWatermarkImageUrl,
          hide_platform_branding: branding.hidePlatformBranding,
          school_class: String(body.gradeLevel || '').slice(0, 30),
          paper_snapshot: responseData,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      testId = inserted?.id || null;

      if (testId) {
        const items = [
          ...paper.mcqs.map((q, index) => ({
            test_id: testId,
            section: 'MCQ',
            position: index,
            marks: 1,
            question_snapshot: q,
          })),
          ...paper.shortQuestions.map((q, index) => ({
            test_id: testId,
            section: 'SHORT',
            position: index,
            marks: q.marks,
            question_snapshot: q,
          })),
          ...paper.longQuestions.map((q, index) => ({
            test_id: testId,
            section: 'LONG',
            position: index,
            marks: q.marks,
            question_snapshot: q,
          })),
        ];
        if (items.length) {
          const { error: itemsError } = await (db.from('teacher_generated_test_items') as any).insert(items);
          if (itemsError) console.warn('Failed to persist test items:', itemsError);
        }
      }
    } catch (error) {
      console.warn('Teacher test persistence skipped:', error);
    }

    return NextResponse.json({ data: { ...responseData, testId } });
  } catch (error) {
    console.error('Teacher test generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The test could not be generated.' },
      { status: 500 }
    );
  }
}
