import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';

type QuizRow = { score: number | null; completed_at: string | null; chapter_ids: string[] | null };
type StudyRow = { duration: number | null; date: string | null; created_at: string | null };

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function computeStudentPredictions(studentId: string) {
  const supabase = createServiceClient() as any;
  const [{ data: profile }, { data: twin }, { data: history }, { data: quizzes }, { data: studies }] = await Promise.all([
    supabase.from('profiles').select('streak, target_marks_percentage, total_marks_percentage').eq('id', studentId).single(),
    supabase.from('student_digital_twin').select('weaknesses, confidence_level, predicted_exam_score').eq('student_id', studentId).maybeSingle(),
    supabase.from('student_digital_twin_history').select('confidence_level, created_at').eq('student_id', studentId).order('created_at', { ascending: true }).limit(30),
    supabase.from('quiz_sessions').select('score, completed_at, chapter_ids').eq('user_id', studentId).eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(30),
    supabase.from('study_sessions').select('duration, date, created_at').eq('user_id', studentId).order('created_at', { ascending: false }).limit(30),
  ]);

  const quizRows = (quizzes || []) as QuizRow[];
  const studyRows = (studies || []) as StudyRow[];
  const recentScores = quizRows.slice(0, 10).map((row) => Number(row.score || 0)).filter(Boolean);
  const olderScores = quizRows.slice(10, 20).map((row) => Number(row.score || 0)).filter(Boolean);
  const scoreTrend = average(recentScores) - average(olderScores);
  const confidenceTrend =
    (history || []).length >= 2
      ? Number(history.at(-1)?.confidence_level || 50) - Number(history[0]?.confidence_level || 50)
      : 0;
  const studyDays = new Set(studyRows.slice(0, 14).map((row) => row.date || row.created_at?.slice(0, 10)).filter(Boolean));
  const studyFrequency = studyDays.size / 14;
  const totalRecentMinutes = studyRows.slice(0, 7).reduce((sum, row) => sum + Number(row.duration || 0), 0) / 60;

  const dropoutRisk = clamp(35 - studyFrequency * 25 - (profile?.streak || 0) * 2 - confidenceTrend * 0.5 + (scoreTrend < 0 ? Math.abs(scoreTrend) * 0.7 : 0));
  const burnoutRisk = clamp(20 + Math.max(0, totalRecentMinutes - 900) / 20 + (scoreTrend < -10 ? 15 : 0) - studyFrequency * 8);
  const predictedBoardMarks = clamp(Number(twin?.predicted_exam_score || average(recentScores) || profile?.total_marks_percentage || 50));
  const weaknesses = (twin?.weaknesses || {}) as Record<string, number>;
  const weakChapterRisk = Object.entries(weaknesses).slice(0, 10).map(([key, confidence]) => ({
    chapter_id: key.split(':')[1],
    risk_pct: clamp(100 - Number(confidence)),
  }));
  const chapterMastery = Object.fromEntries(weakChapterRisk.map((item) => [item.chapter_id, Math.max(1, Math.round(item.risk_pct / 18))]));

  let narrative = {
    student_message: 'Your recent activity suggests a manageable plan with focused revision.',
    parent_message: 'Risk scores are based on recent study frequency, score trend, streak, and confidence trend.',
  };
  try {
    const ai = await gatewayChat({
      provider: 'groq',
      tier: 'mini',
      messages: [
        { role: 'system', content: 'Write supportive, non-alarming learning analytics explanations. Return JSON only.' },
        { role: 'user', content: JSON.stringify({ dropoutRisk, burnoutRisk, scoreTrend, studyFrequency, confidenceTrend }) },
      ],
      maxTokens: 700,
      temperature: 0.25,
    });
    narrative = parseAiJson(ai.text, narrative);
  } catch {}

  const payload = {
    student_id: studentId,
    predicted_board_marks: predictedBoardMarks,
    predicted_entry_test_score: clamp(predictedBoardMarks - 5),
    admission_probability: [],
    dropout_risk_score: dropoutRisk,
    burnout_risk_score: burnoutRisk,
    weak_chapter_risk: weakChapterRisk,
    chapter_mastery_estimate: chapterMastery,
    narrative,
    computed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('student_predictions').insert(payload);
  if (error) throw error;
  return payload;
}
