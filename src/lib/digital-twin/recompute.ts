import { createServiceClient } from '@/lib/supabase/service';

type JsonMap = Record<string, number>;

type QuizSessionSignal = {
  subject_id: string | null;
  chapter_ids: string[] | null;
  completed_at: string | null;
  time_spent: number | null;
  score: number | null;
  total_marks: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  skipped_count: number | null;
};

type StudySessionSignal = {
  duration: number | null;
  date: string | null;
  created_at: string | null;
};

type TwinGate = {
  last_recomputed_at: string | null;
  signal_count: number | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function bucketStudyTime(value?: string | null) {
  if (!value) return null;
  const hour = new Date(value).getHours();
  if (Number.isNaN(hour)) return null;
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function sortedObject(entries: [string, number][], ascending = true): JsonMap {
  return Object.fromEntries(
    entries
      .filter(([, value]) => Number.isFinite(value))
      .sort((a, b) => ascending ? a[1] - b[1] : b[1] - a[1])
      .slice(0, 20)
      .map(([key, value]) => [key, Math.round(clamp(value))])
  );
}

export async function shouldRecomputeDigitalTwin(studentId: string) {
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from('student_digital_twin')
    .select('last_recomputed_at, signal_count')
    .eq('student_id', studentId)
    .maybeSingle();

  const twin = data as TwinGate;
  if (error || !twin?.last_recomputed_at) return true;

  const minutesSince = (Date.now() - new Date(twin.last_recomputed_at).getTime()) / 60000;
  const nextSignalCount = (twin.signal_count || 0) + 1;

  if (minutesSince < 10 && nextSignalCount < 3) {
    await supabase
      .from('student_digital_twin')
      .update({ signal_count: nextSignalCount, updated_at: new Date().toISOString() })
      .eq('student_id', studentId);
    return false;
  }

  return true;
}

export async function recomputeDigitalTwin(studentId: string) {
  const supabase = createServiceClient() as any;

  const [{ data: quizRows, error: quizError }, { data: studyRows, error: studyError }] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('subject_id, chapter_ids, completed_at, time_spent, score, total_marks, correct_count, incorrect_count, skipped_count')
      .eq('user_id', studentId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(50),
    supabase
      .from('study_sessions')
      .select('duration, date, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (quizError) throw quizError;
  if (studyError) throw studyError;

  const quizzes = (quizRows || []) as QuizSessionSignal[];
  const studies = (studyRows || []) as StudySessionSignal[];
  const weaknessTotals = new Map<string, { incorrect: number; total: number }>();
  const strengthTotals = new Map<string, { correct: number; total: number; speed: number[] }>();
  const solveSpeeds: number[] = [];
  let weightedScore = 0;
  let weightTotal = 0;

  quizzes.forEach((session, index) => {
    const total = (session.correct_count || 0) + (session.incorrect_count || 0) + (session.skipped_count || 0);
    if (total <= 0 || !session.subject_id) return;

    const speed = (session.time_spent || 0) > 0 ? (session.time_spent || 0) / total : 0;
    if (speed > 0) solveSpeeds.push(speed);

    const score =
      typeof session.score === 'number'
        ? session.score
        : session.total_marks && session.total_marks > 0
          ? ((session.correct_count || 0) / session.total_marks) * 100
          : ((session.correct_count || 0) / total) * 100;
    const recencyWeight = Math.max(1, 50 - index);
    weightedScore += clamp(score) * recencyWeight;
    weightTotal += recencyWeight;

    const chapterIds = session.chapter_ids?.length ? session.chapter_ids : ['unmapped'];
    for (const chapterId of chapterIds) {
      const key = `${session.subject_id}:${chapterId}`;
      const weak = weaknessTotals.get(key) || { incorrect: 0, total: 0 };
      weak.incorrect += (session.incorrect_count || 0) + (session.skipped_count || 0) * 0.6;
      weak.total += total;
      weaknessTotals.set(key, weak);

      const strong = strengthTotals.get(key) || { correct: 0, total: 0, speed: [] };
      strong.correct += session.correct_count || 0;
      strong.total += total;
      if (speed > 0) strong.speed.push(speed);
      strengthTotals.set(key, strong);
    }
  });

  const avgSolveSpeed = solveSpeeds.length
    ? solveSpeeds.reduce((sum, value) => sum + value, 0) / solveSpeeds.length
    : null;

  const weaknessEntries: [string, number][] = Array.from(weaknessTotals.entries()).map(([key, value]) => [
    key,
    100 - (value.incorrect / Math.max(1, value.total)) * 100,
  ]);

  const strengthEntries: [string, number][] = Array.from(strengthTotals.entries()).map(([key, value]) => {
    const correctRate = (value.correct / Math.max(1, value.total)) * 100;
    const avgSpeed = value.speed.length ? value.speed.reduce((sum, item) => sum + item, 0) / value.speed.length : avgSolveSpeed || 60;
    const speedBoost = avgSolveSpeed && avgSpeed < avgSolveSpeed ? 10 : 0;
    return [key, clamp(correctRate + speedBoost)];
  });

  const timeBuckets = new Map<string, number>();
  for (const study of studies) {
    const bucket = bucketStudyTime(study.created_at || study.date);
    if (bucket) timeBuckets.set(bucket, (timeBuckets.get(bucket) || 0) + 1);
  }
  const preferredStudyTime =
    Array.from(timeBuckets.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const attentionSpanMinutes = studies.length
    ? studies.reduce((sum, item) => sum + (item.duration || 0), 0) / studies.length / 60
    : null;
  const confidenceLevel = weightTotal > 0 ? weightedScore / weightTotal : 50;
  const predictedExamScore = clamp(confidenceLevel + (avgSolveSpeed && avgSolveSpeed < 45 ? 4 : 0));
  const now = new Date().toISOString();
  const payload = {
    student_id: studentId,
    strengths: sortedObject(strengthEntries, false),
    weaknesses: sortedObject(weaknessEntries, true),
    avg_solve_speed_seconds: avgSolveSpeed,
    attention_span_minutes: attentionSpanMinutes,
    preferred_study_time: preferredStudyTime,
    confidence_level: Math.round(clamp(confidenceLevel)),
    predicted_exam_score: Math.round(predictedExamScore),
    last_recomputed_at: now,
    signal_count: 0,
    updated_at: now,
  };

  const { data: twin, error: upsertError } = await supabase
    .from('student_digital_twin')
    .upsert(payload, { onConflict: 'student_id' })
    .select('id')
    .single();

  if (upsertError) throw upsertError;

  await supabase.from('student_digital_twin_history').insert({
    student_id: studentId,
    confidence_level: payload.confidence_level,
    predicted_exam_score: payload.predicted_exam_score,
    strengths: payload.strengths,
    weaknesses: payload.weaknesses,
  });

  const { data: historyRows } = await supabase
    .from('student_digital_twin_history')
    .select('id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .range(90, 500);

  const staleIds = (historyRows || []).map((row: { id: string }) => row.id);
  if (staleIds.length) {
    await supabase.from('student_digital_twin_history').delete().in('id', staleIds);
  }

  return { ...payload, id: twin?.id };
}
