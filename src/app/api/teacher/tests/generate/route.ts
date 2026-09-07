import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateChapterQuestionPaper, type BankMcq, type BankSubjectiveQuestion } from '@/lib/tests/chapter-question-bank';
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

// A teacher building a paper in "Custom" mode types their own questions for a type instead of
// picking a count for the AI to fill randomly (see mcqMode/shortMode/etc in TeacherTestStudio).
// These sanitize whatever the client sent into the same shape the chapter question bank
// produces, so everything downstream (totals, persistence, PDF rendering) treats a manual
// question exactly like a bank-picked one.
function sanitizeManualMcqs(raw: unknown, max: number): BankMcq[] {
  if (!Array.isArray(raw)) return [];
  const out: BankMcq[] = [];
  for (const entry of raw) {
    const item = entry as Record<string, unknown>;
    const q = String(item?.q || '').trim().slice(0, 1000);
    if (!q) continue;
    const opts = Array.isArray(item?.opts)
      ? (item.opts as unknown[])
          .map((option) => String(option || '').trim().slice(0, 300))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    if (opts.length < 2) continue;
    let correct = Number(item?.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= opts.length) correct = 0;
    out.push({ q, opts, correct, exp: String(item?.exp || '').trim().slice(0, 500), difficulty: null });
    if (out.length >= max) break;
  }
  return out;
}

function sanitizeManualQuestions(raw: unknown, max: number, defaultMarks: number): BankSubjectiveQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: BankSubjectiveQuestion[] = [];
  for (const entry of raw) {
    const item = entry as Record<string, unknown>;
    const q = String(item?.q || '').trim().slice(0, 3000);
    if (!q) continue;
    const parsedMarks = Number(item?.marks);
    const marks = parsedMarks > 0 ? Math.min(50, Math.round(parsedMarks)) : defaultMarks;
    const modelAnswer = String(item?.modelAnswer || '').trim().slice(0, 3000);
    out.push({ q, marks, keyPoints: [], modelAnswer, difficulty: null });
    if (out.length >= max) break;
  }
  return out;
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

    // "Custom" mode (per-type Auto/Manual in TeacherTestStudio) — a manualX array present means
    // that section is hand-authored, so its auto count is 0 (skip the bank fetch/random-pick
    // entirely for it) and the sanitized manual questions replace it below instead.
    const mcqIsManual = Array.isArray(body.manualMcqs);
    const shortIsManual = Array.isArray(body.manualShortQuestions);
    const longIsManual = Array.isArray(body.manualLongQuestions);
    const letterIsManual = Array.isArray(body.manualLetterQuestions);
    const vocabIsManual = Array.isArray(body.manualVocabQuestions);
    const grammarIsManual = Array.isArray(body.manualGrammarQuestions);
    const numericalIsManual = Array.isArray(body.manualNumericalQuestions);

    const mcqCount = mcqIsManual ? 0 : count(body.mcqCount, 5, 100);
    const shortCount = shortIsManual ? 0 : count(body.shortCount, 5, 50);
    const longCount = longIsManual ? 0 : count(body.longCount, 2, 20);
    const letterCount = letterIsManual ? 0 : count(body.letterCount, 3, 20);
    const vocabCount = vocabIsManual ? 0 : count(body.vocabCount, 5, 30);
    const grammarCount = grammarIsManual ? 0 : count(body.grammarCount, 3, 20);
    const numericalCount = numericalIsManual ? 0 : count(body.numericalCount, 5, 20);
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
      letterCount,
      vocabCount,
      grammarCount,
      numericalCount,
      difficulty,
    });

    if (mcqIsManual) paper.mcqs = sanitizeManualMcqs(body.manualMcqs, 100);
    if (shortIsManual) paper.shortQuestions = sanitizeManualQuestions(body.manualShortQuestions, 50, 3);
    if (longIsManual) paper.longQuestions = sanitizeManualQuestions(body.manualLongQuestions, 20, 8);
    if (letterIsManual) paper.letterQuestions = sanitizeManualQuestions(body.manualLetterQuestions, 20, 3);
    if (vocabIsManual) paper.vocabQuestions = sanitizeManualQuestions(body.manualVocabQuestions, 30, 3);
    if (grammarIsManual) paper.grammarQuestions = sanitizeManualQuestions(body.manualGrammarQuestions, 20, 3);
    if (numericalIsManual) paper.numericalQuestions = sanitizeManualQuestions(body.manualNumericalQuestions, 20, 5);

    const anyManual =
      mcqIsManual || shortIsManual || longIsManual || letterIsManual || vocabIsManual || grammarIsManual || numericalIsManual;

    if (
      !paper.mcqs.length &&
      !paper.shortQuestions.length &&
      !paper.longQuestions.length &&
      !paper.letterQuestions.length &&
      !paper.vocabQuestions.length &&
      !paper.grammarQuestions.length &&
      !paper.numericalQuestions.length
    ) {
      return NextResponse.json(
        {
          error: anyManual
            ? 'Add at least one question, or switch a section back to Auto.'
            : 'No uploaded source questions are available for this chapter yet.',
        },
        { status: 409 }
      );
    }

    const totalMarks =
      paper.mcqs.length +
      paper.shortQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.longQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.letterQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.vocabQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.grammarQuestions.reduce((sum, question) => sum + question.marks, 0) +
      paper.numericalQuestions.reduce((sum, question) => sum + question.marks, 0);

    const institutionName =
      (planTier === 'PRO' || planTier === 'ELITE') && branding.customHeader
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
      requestedCounts: {
        // A manual section's "requested" count is just what actually made it through
        // sanitization — there's no random bank pool for it to fall short against.
        mcq: mcqIsManual ? paper.mcqs.length : mcqCount,
        short: shortIsManual ? paper.shortQuestions.length : shortCount,
        long: longIsManual ? paper.longQuestions.length : longCount,
        letter: letterIsManual ? paper.letterQuestions.length : letterCount,
        vocab: vocabIsManual ? paper.vocabQuestions.length : vocabCount,
        grammar: grammarIsManual ? paper.grammarQuestions.length : grammarCount,
        numerical: numericalIsManual ? paper.numericalQuestions.length : numericalCount,
      },
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
          ...paper.letterQuestions.map((q, index) => ({
            test_id: testId,
            section: 'LETTER',
            position: index,
            marks: q.marks,
            question_snapshot: q,
          })),
          ...paper.vocabQuestions.map((q, index) => ({
            test_id: testId,
            section: 'VOCAB',
            position: index,
            marks: q.marks,
            question_snapshot: q,
          })),
          ...paper.grammarQuestions.map((q, index) => ({
            test_id: testId,
            section: 'GRAMMAR',
            position: index,
            marks: q.marks,
            question_snapshot: q,
          })),
          ...paper.numericalQuestions.map((q, index) => ({
            test_id: testId,
            section: 'NUMERICAL',
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
