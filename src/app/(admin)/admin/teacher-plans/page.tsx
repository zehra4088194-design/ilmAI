import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { TeacherPlanCapacityForm } from '@/components/features/admin/TeacherPlanCapacityForm';

export const metadata: Metadata = { title: 'Admin - Teacher Plans' };

export default async function AdminTeacherPlansPage() {
  const db = createServiceClient() as any;
  const { data } = await db.from('platform_settings').select('value').eq('key', 'subscription_plans').maybeSingle();
  const plans = data?.value?.teacherPlans || {};
  return <TeacherPlanCapacityForm initialPlans={plans} />;
}
