'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminUser } from '@/lib/admin/auth';

// requireAdminUser() is the authorization gate here (it also honors the
// ADMIN_EMAILS allowlist, not just profiles.role='admin' — see
// refresh-exchange-rate/route.ts for the same app-level fix). The actual
// writes use the service-role client instead of the request-scoped one:
// the `opportunities` table's RLS policy only allows profiles.role='admin',
// so an ADMIN_EMAILS-only admin passes requireAdminUser() but would still
// get silently blocked by RLS on the write itself if we used the regular
// client here.
export async function createOpportunity(formData: FormData) {
  if (!(await requireAdminUser())) return;
  const supabase = createServiceClient() as any;
  await supabase.from('opportunities').insert({
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
  if (!(await requireAdminUser())) return;
  const supabase = createServiceClient() as any;
  await supabase
    .from('opportunities')
    .update({ is_verified: formData.get('is_verified') === 'true' })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/opportunities');
}

export async function deleteOpportunity(formData: FormData) {
  if (!(await requireAdminUser())) return;
  const supabase = createServiceClient() as any;
  await supabase.from('opportunities').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/opportunities');
}
