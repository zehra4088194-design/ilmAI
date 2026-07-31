import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCorrectOptionIndex, normalizeQuestionOptions } from '@/lib/diagnostic/questions';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

function matchesScienceGroup(
  subject: { id: string; name: string; slug: string; stream: string | null; is_optional: boolean },
  scienceGroup: string | null,
  optionalSubjectIds: string[],
) {
  if (!subject.is_optional) return true;
  if (optionalSubjectIds.includes(subject.id)) return true;
  if (!scienceGroup) return false;
  const identity = `${subject.name} ${subject.slug} ${subject.stream || ''}`.toLowerCase();
  return scienceGroup === 'biology'
    ? identity.includes('biology') || identity.includes('pre-medical')
    : identity.includes('computer');
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, board, grade_level, optional_subject_ids, science_group')
    .eq('id', user.id)
    .maybeSingle();
  const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
  const settings = await getPlatformSettings();
  if (!getPlanFromSettings(settings, tier).access.games) {
    return NextResponse.json({ error: 'Live games are available on Pro and Elite.' }, { status: 402 });
  }
  if (!profile?.board || !profile.grade_level) {
    return NextResponse.json({ error: 'Complete your class and board profile before playing.' }, { status: 400 });
  }

  const db = createServiceClient() as any;
  const { data: subjects, error: subjectError } = await db
    .from('subjects')
    .select('id, name, slug, stream, is_optional')
    .eq('is_active', true)
    .contains('boards', [profile.board])
    .contains('grade_levels', [profile.grade_level]);
  if (subjectError) return NextResponse.json({ error: 'Subjects could not be loaded.' }, { status: 500 });

  const optionalSubjectIds = profile.optional_subject_ids || [];
  const subjectIds = (subjects || [])
    .filter((subject: any) => matchesScienceGroup(subject, profile.science_group, optionalSubjectIds))
    .map((subject: any) => subject.id);
  if (!subjectIds.length) {
    return NextResponse.json({ error: 'No subjects are configured for your class yet.' }, { status: 404 });
  }

  const excludedIds = (req.nextUrl.searchParams.get('exclude') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 20);
  let query = db
    .from('questions')
    .select('id, text, options, correct_answer, subject_id, chapter_id, subjects(name), chapters(name)')
    .in('subject_id', subjectIds)
    .eq('type', 'MCQ')
    .order('is_verified', { ascending: false })
    .limit(200);
  if (excludedIds.length) query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: 'Questions could not be loaded.' }, { status: 500 });

  const questions = (rows || [])
    .map((row: any) => ({
      row,
      options: normalizeQuestionOptions(row.options),
      correctIndex: getCorrectOptionIndex(row.options, row.correct_answer),
    }))
    .filter((item: any) => item.options.length >= 2 && item.correctIndex !== null);
  if (!questions.length) {
    return NextResponse.json({ error: 'No ready MCQs were found for your class and selected subjects.' }, { status: 404 });
  }

  const selected = questions[Math.floor(Math.random() * questions.length)]!;
  const subject = Array.isArray(selected.row.subjects) ? selected.row.subjects[0] : selected.row.subjects;
  const chapter = Array.isArray(selected.row.chapters) ? selected.row.chapters[0] : selected.row.chapters;
  return NextResponse.json({
    question: {
      id: selected.row.id,
      text: selected.row.text,
      options: selected.options,
      correctIndex: selected.correctIndex,
      subjectName: subject?.name || 'Subject',
      chapterName: chapter?.name || 'Chapter',
    },
  });
}
