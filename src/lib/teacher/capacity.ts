import { createServiceClient } from '@/lib/supabase/service';

export type TeacherCapacityTier = 'FREE' | 'PRO' | 'ELITE';

const DEFAULT_STUDENT_LIMITS: Record<TeacherCapacityTier, number | null> = { FREE: 10, PRO: 100, ELITE: 500 };
const DEFAULT_CLASSROOM_LIMITS: Record<TeacherCapacityTier, number | null> = { FREE: 1, PRO: 5, ELITE: null };

async function readTeacherPlan(tier: TeacherCapacityTier) {
  const db = createServiceClient() as any;
  const { data } = await db.from('platform_settings').select('value').eq('key', 'subscription_plans').maybeSingle();
  const key = tier === 'FREE' ? 'free' : tier === 'PRO' ? 'paid' : 'elite';
  return data?.value?.teacherPlans?.[key] || {};
}

/** Reads teacher student limits from the same platform_settings record the admin panel uses. */
export async function getTeacherStudentLimit(tier: TeacherCapacityTier): Promise<number | null> {
  const raw = await readTeacherPlan(tier);
  const configured = raw.studentsMax;
  if (configured === null || configured === -1) return null;
  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_STUDENT_LIMITS[tier];
}

export async function getTeacherClassroomLimit(tier: TeacherCapacityTier): Promise<number | null> {
  const raw = await readTeacherPlan(tier);
  const configured = raw.classroomsMax;
  if (configured === null || configured === -1) return null;
  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_CLASSROOM_LIMITS[tier];
}

export async function getTeacherUsage(teacherId: string) {
  const db = createServiceClient() as any;
  const { data: classes } = await db.from('teacher_classes').select('id').eq('teacher_id', teacherId);
  const classIds = (classes || []).map((row: any) => row.id);
  if (!classIds.length) return { classrooms: 0, students: 0 };
  const { data: enrollments } = await db.from('class_enrollments').select('student_id').in('class_id', classIds);
  return { classrooms: classIds.length, students: new Set((enrollments || []).map((row: any) => row.student_id)).size };
}

export function defaultTeacherStudentLimit(tier: TeacherCapacityTier) { return DEFAULT_STUDENT_LIMITS[tier]; }
