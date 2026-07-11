'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (profile?.role !== 'admin') return;
  await supabase.from('opportunities' as any).insert({
    title: formData.get('title'),
    type: formData.get('type'),
    organization: formData.get('organization'),
    description: formData.get('description'),
    eligibility: formData.get('eligibility'),
    deadline: formData.get('deadline') || null,
    external_url: formData.get('external_url'),
    is_verified: formData.get('is_verified') === 'on',
    source: 'admin',
  });
  revalidatePath('/admin/opportunities');
}

export async function toggleOpportunityVerified(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (profile?.role !== 'admin') return;
  await supabase
    .from('opportunities' as any)
    .update({ is_verified: formData.get('is_verified') === 'true' })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/opportunities');
}

export async function deleteOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (profile?.role !== 'admin') return;
  await supabase.from('opportunities' as any).delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/opportunities');
}
