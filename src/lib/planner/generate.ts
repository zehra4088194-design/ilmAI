import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { addDaysIso, pakistanDateIso } from '@/lib/dates/pakistan';

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

function daysBetween(startIso: string, endIso: string | null) {
  const endIsoValue = endIso || addDaysIso(startIso, 7);
  const startTime = new Date(`${startIso}T12:00:00Z`).getTime();
  const endTime = new Date(`${endIsoValue}T12:00:00Z`).getTime();
  const count = Math.max(1, Math.ceil((endTime - startTime) / 86400000) + 1);
  return Array.from({ length: Math.min(count, 90) }, (_, index) => addDaysIso(startIso, index));
}

function normalizeSessions(items: AiPlanSession[], input: GenerateStudyPlanInput) {
  const allowedDates = new Set(daysBetween(pakistanDateIso(), input.examDate));
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
  const dates = daysBetween(pakistanDateIso(), input.examDate);
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

  const fallbackRows = () => normalizeSessions(fallbackSessions(input, weakKeys), input);
  let rows = aiSessions.length ? normalizeSessions(aiSessions, input) : fallbackRows();
  if (rows.length === 0) rows = fallbackRows();
  if (rows.length === 0) throw new Error('No valid planner sessions could be generated.');

  let { data, error } = await db.from('study_plan_sessions').insert(rows).select('id');
  if (error && aiSessions.length) {
    const retryRows = fallbackRows();
    if (retryRows.length) {
      const retry = await db.from('study_plan_sessions').insert(retryRows).select('id');
      data = retry.data;
      error = retry.error;
    }
  }
  if (error || !data?.length) throw error || new Error('No planner sessions were saved.');

  return data || [];
}
