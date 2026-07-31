'use server';

import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import type { SchoolActionState } from '@/lib/school-erp/types';

export async function createSchoolOrganization(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const name = String(formData.get('name') || '').trim();
  const ownerEmail = String(formData.get('owner_email') || '')
    .trim()
    .toLowerCase();
  const campusName = String(formData.get('campus_name') || 'Main Campus').trim();
  const slug = slugify(String(formData.get('slug') || name), { lower: true, strict: true }).slice(0, 80);
  if (name.length < 2 || !slug || !ownerEmail.includes('@')) {
    return { success: false, message: 'School name, slug, and a registered owner email are required.' };
  }

  const db = (await createAdminClient()) as any;
  const { data: owner } = await db.from('profiles').select('id').eq('email', ownerEmail).maybeSingle();
  if (!owner) return { success: false, message: 'The owner email must register an ilm AI account first.' };

  const { data: organization, error } = await db
    .from('school_organizations')
    .insert({
      name,
      slug,
      organization_type: String(formData.get('organization_type') || 'school'),
      status: 'active',
      email: String(formData.get('email') || '').trim() || null,
      phone: String(formData.get('phone') || '').trim() || null,
      address: String(formData.get('address') || '').trim() || null,
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error) return { success: false, message: error.message };

  const { data: campus, error: campusError } = await db
    .from('school_campuses')
    .insert({
      organization_id: organization.id,
      name: campusName || 'Main Campus',
      code: 'MAIN',
      is_main: true,
      address: String(formData.get('address') || '').trim() || null,
    })
    .select('id')
    .single();
  if (campusError) {
    await db.from('school_organizations').delete().eq('id', organization.id);
    return { success: false, message: campusError.message };
  }

  const { error: membershipError } = await db.from('school_memberships').insert({
    organization_id: organization.id,
    campus_id: campus.id,
    profile_id: owner.id,
    member_role: 'owner',
    status: 'active',
  });
  if (membershipError) {
    await db.from('school_organizations').delete().eq('id', organization.id);
    return { success: false, message: membershipError.message };
  }

  await db.from('school_audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: admin.id,
    action: 'create',
    entity_type: 'school_organization',
    entity_id: organization.id,
    metadata: { ownerEmail },
  });
  revalidatePath('/admin/schools');
  return { success: true, message: `${name} created and assigned to ${ownerEmail}.` };
}
