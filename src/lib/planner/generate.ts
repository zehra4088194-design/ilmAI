import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';

type PlannerDb = any;

export type GenerateStudyPlanInput = {
  planId: string;
  studentId: string;
  examDate: string | null;
  dailyAvailableHours: number;
  focusSubjectIds: string[];
  constraints: Record<string, unknown>;
};

type AiPlanSession = {
  date: string;
  subject_id: string | null;
  chapter_id: string | null;
  type: 'study' | 'revision' | 'mock_test' | 'break';
  duration_minutes: number;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(startIso: string, endIso: string | null) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00`) : addDays(start, 7);
  const count = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  return Array.from({ length: Math.min(count, 90) }, (_, index) => addDays(start, index).toISOString().slice(0, 10));
}

function normalizeSessions(items: AiPlanSession[], input: GenerateStudyPlanInput) {
  const allowedDates = new Set(daysBetween(todayIso(), input.examDate));
  const dailyLimit = Math.max(30, Math.round(input.dailyAvailableHours * 60));
  const used = new Map<string, number>();

  return items
    .filter((item) => item.date && allowedDates.has(item.date))
    .map((item) => {
      const usedToday = used.get(item.date) || 0;
      const remaining = Math.max(0, dailyLimit - usedToday);
      const duration = Math.min(Math.max(15, Math.round(Number(item.duration_minutes) || 30)), Math.max(15, remaining));
      used.set(item.date, usedToday + duration);
      return {
        plan_id: input.planId,
        student_id: input.studentId,
        session_date: item.date,
        subject_id: item.subject_id,
        chapter_id: item.chapter_id,
        session_type: item.type || 'study',
        duration_minutes: duration,
      };
    })
    .filter((item) => item.duration_minutes > 0);
}

function fallbackSessions(input: GenerateStudyPlanInput, weakKeys: string[]) {
  const dates = daysBetween(todayIso(), input.examDate);
  const targetKeys = weakKeys.length ? weakKeys : input.focusSubjectIds.map((id) => `${id}:`);
  const minutesPerDay = Math.max(30, Math.round(input.dailyAvailableHours * 60));
  const block = minutesPerDay >= 90 ? 45 : minutesPerDay;
  const sessions: AiPlanSession[] = [];

  dates.forEach((date, dateIndex) => {
    const key = targetKeys[dateIndex % Math.max(1, targetKeys.length)] || ':';
    const [subjectId, chapterId] = key.split(':');
    sessions.push({
      date,
      subject_id: subjectId || input.focusSubjectIds[0] || null,
      chapter_id: chapterId || null,
      type: dateIndex % 6 === 5 ? 'mock_test' : dateIndex % 3 === 2 ? 'revision' : 'study',
      duration_minutes: block,
    });
    if (minutesPerDay >= 120 && targetKeys.length > 1) {
      const secondKey = targetKeys[(dateIndex + 1) % targetKeys.length] || ':';
      const [secondSubjectId, secondChapterId] = secondKey.split(':');
      sessions.push({
        date,
        subject_id: secondSubjectId || input.focusSubjectIds[0] || null,
        chapter_id: secondChapterId || null,
        type: 'revision',
        duration_minutes: Math.min(45, minutesPerDay - block),
      });
    }
  });

  return sessions;
}

export async function generateStudyPlanSessions(db: PlannerDb, input: GenerateStudyPlanInput) {
  const { data: twin } = await db
    .from('student_digital_twin')
    .select('weaknesses, preferred_study_time')
    .eq('student_id', input.studentId)
    .maybeSingle();

  const weaknesses = (twin?.weaknesses || {}) as Record<string, number>;
  const weakKeys = Object.entries(weaknesses)
    .sort((a, b) => a[1] - b[1])
    .filter(([key]) => input.focusSubjectIds.length === 0 || input.focusSubjectIds.includes(key.split(':')[0] || ''))
    .map(([key]) => key);

  const prompt = `Create a study plan from today through exam_date.
Return only JSON array: [{"date":"YYYY-MM-DD","subject_id":"uuid or null","chapter_id":"uuid or null","type":"study|revision|mock_test|break","duration_minutes":45}]
Student data:
${JSON.stringify({ ...input, preferredStudyTime: twin?.preferred_study_time, weakKeys })}
Rules: stay within dailyAvailableHours, prioritize weakKeys, respect constraint windows by avoiding overloaded days.`;

  let aiSessions: AiPlanSession[] = [];
  try {
    const result = await gatewayChat({
      provider: 'groq',
      tier: 'medium',
      messages: [
        { role: 'system', content: 'You are a study planner. Return only valid JSON, no markdown fences.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 4096,
      temperature: 0.25,
    });
    aiSessions = parseAiJson<AiPlanSession[]>(result.text, []);
  } catch (error) {
    console.error('AI planner generation failed, using fallback:', error);
  }

  const rows = normalizeSessions(aiSessions.length ? aiSessions : fallbackSessions(input, weakKeys), input);
  if (rows.length === 0) return [];

  const { data, error } = await db.from('study_plan_sessions').insert(rows).select('id');
  if (error) throw error;

  return data || [];
}
