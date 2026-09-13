import { createServiceClient } from '@/lib/supabase/service';

export type TeacherCapacityTier = 'FREE' | 'PRO' | 'ELITE';

const DEFAULT_STUDENT_LIMITS: Record<TeacherCapacityTier, number | null> = {
  FREE: 10,
  PRO: 100,
  ELITE: 500,
};

/** Reads teacher student limits from the same platform_settings record the admin panel uses. */
export async function getTeacherStudentLimit(tier: TeacherCapacityTier): Promise<number | null> {
  const db = createServiceClient() as any;
  const { data } = await db.from('platform_settings').select('value').eq('key', 'subscription_plans').maybeSingle();
  const raw = data?.value?.teacherPlans?.[tier.toLowerCase() === 'pro' ? 'paid' : tier.toLowerCase()];
  const configured = raw?.studentsMax;
  if (configured === null || configured === -1) return null;
  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_STUDENT_LIMITS[tier];
}

export function defaultTeacherStudentLimit(tier: TeacherCapacityTier) {
  return DEFAULT_STUDENT_LIMITS[tier];
}
