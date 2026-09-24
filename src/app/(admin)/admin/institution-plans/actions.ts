'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

export async function updateInstitutionAiPlanConfig(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin) throw new Error('Admin access required.');

  const id = String(formData.get('id') || '');
  const institutionType = String(formData.get('institution_type') || '');
  const planCode = String(formData.get('plan_code') || '');
  const allowance = Number(formData.get('free_student_allowance'));
  const price = Number(formData.get('student_price_usd'));
  const isActive = formData.get('is_active') === 'on';

  if (!id || !['school', 'college'].includes(institutionType) || !['PRO', 'ELITE', 'CUSTOM'].includes(planCode)) {
    throw new Error('Invalid institution plan.');
  }
  if (!Number.isInteger(allowance) || allowance < 0 || allowance > 1000000) {
    throw new Error('Free student allowance must be a whole number between 0 and 1,000,000.');
  }
  if (!Number.isFinite(price) || price < 0 || price > 100000) {
    throw new Error('Student price must be a valid non-negative amount.');
  }

  const db = (await createAdminClient()) as any;
  const { error } = await db
    .from('institution_ai_plan_config')
    .update({
      free_student_allowance: allowance,
      student_price_usd: planCode === 'CUSTOM' ? Number(price.toFixed(2)) : 0,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('institution_type', institutionType)
    .eq('plan_code', planCode);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/institution-plans');
  revalidatePath('/admin/settings');
}
