'use server';

// ============================================
// COLLEGE BULK IMPORT
// College mirror of src/lib/school-erp/import-actions.ts — same CSV-first onboarding flow,
// college_* tables (registration_number instead of admission_number, college_sections instead of
// school_sections). See that file's header comment for the full rationale.
// ============================================

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { parseCsv } from '@/lib/school-erp/csv';
import { getActiveCollegeOrganizationId, getCollegeContext, hasCollegeModule, hasCollegePermission } from './access';
import { INITIAL_COLLEGE_IMPORT_STATE, type CollegeImportState } from './import-types';
import { isCollegeOrganizationBillingActive, syncOrganizationCollegeGrants } from './subscription-cascade';
import type { CollegeContext } from './types';

const MAX_ROWS = 400;
const STAFF_ROLES = ['teacher', 'staff', 'accountant', 'admissions', 'admin'];

function fail(message: string): CollegeImportState {
  return { ...INITIAL_COLLEGE_IMPORT_STATE, message };
}

async function importContext(module: 'people') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const organizationId = await getActiveCollegeOrganizationId();
  const context =
    (organizationId ? await getCollegeContext(supabase, user.id, organizationId) : null) ||
    (await getCollegeContext(supabase, user.id));
  if (!context || !hasCollegePermission(context, 'people.manage')) {
    throw new Error('You do not have permission to import people.');
  }
  if (!hasCollegeModule(context, module)) throw new Error('This module is not included in your institution plan.');
  const limit = await checkDailyLimit(user.id, 'erp_mutation:import', 20);
  if (!limit.success) throw new Error('Import limit reached for today. Try again tomorrow.');
  return { context, admin: (await createAdminClient()) as any };
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function fallbackEmail(context: CollegeContext, identifier: string) {
  const handle = identifier
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${handle}.${context.organization.slug}@students.ilmai.study`;
}

async function resolveProfile(
  admin: any,
  email: string,
  fullName: string,
  phone: string | null
): Promise<{ id: string; password: string | null }> {
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await admin.from('profiles').select('id').eq('email', normalized).maybeSingle();
  if (existing?.id) return { id: existing.id, password: null };

  const password = generatePassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !created?.user?.id) {
    const { data: retry } = await admin.from('profiles').select('id').eq('email', normalized).maybeSingle();
    if (retry?.id) return { id: retry.id, password: null };
    throw new Error(error?.message || 'Could not create a login for this person.');
  }

  await admin
    .from('profiles')
    .update({ full_name: fullName, ...(phone ? { phone } : {}) })
    .eq('id', created.user.id);
  return { id: created.user.id, password };
}

async function upsertMembership(admin: any, context: CollegeContext, profileId: string, role: string, extra: any = {}) {
  await admin.from('college_memberships').upsert(
    {
      organization_id: context.organization.id,
      profile_id: profileId,
      member_role: role,
      status: 'active',
      updated_at: new Date().toISOString(),
      ...extra,
    },
    { onConflict: 'organization_id,profile_id,member_role' }
  );
}

export async function importCollegeStudents(
  _state: CollegeImportState,
  formData: FormData
): Promise<CollegeImportState> {
  let context: CollegeContext;
  let admin: any;
  try {
    ({ context, admin } = await importContext('people'));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Import failed.');
  }

  const academicYearId = String(formData.get('academic_year_id') || '').trim();
  const defaultSectionId = String(formData.get('section_id') || '').trim();
  const { rows } = parseCsv(String(formData.get('csv') || ''));
  if (!academicYearId) return fail('Select the academic year these students belong to.');
  if (!rows.length) return fail('The file has no data rows. Add a header row and at least one student.');
  if (rows.length > MAX_ROWS) return fail(`Import up to ${MAX_ROWS} students at a time. Split the file and re-upload.`);

  const { data: sections } = await admin
    .from('college_sections')
    .select('id, name, college_semesters(name)')
    .eq('organization_id', context.organization.id);
  const sectionByName = new Map<string, string>();
  for (const section of sections || []) {
    const semesterName = (Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters)?.name;
    sectionByName.set(String(section.name).toLowerCase(), section.id);
    if (semesterName) sectionByName.set(`${semesterName} ${section.name}`.toLowerCase(), section.id);
  }

  const [{ data: plan }, { count: activeStudents }] = await Promise.all([
    admin
      .from('college_organization_plan_settings')
      .select('max_students')
      .eq('organization_id', context.organization.id)
      .maybeSingle(),
    admin
      .from('college_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organization.id)
      .eq('status', 'active'),
  ]);
  const maxStudents = Number(plan?.max_students ?? 200);
  let seatsUsed = Number(activeStudents || 0);

  const state: CollegeImportState = { ...INITIAL_COLLEGE_IMPORT_STATE, errors: [], credentials: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const line = index + 2;
    const fullName = row.full_name || row.name || row.student_name || '';
    const registrationNumber = row.registration_number || row.admission_number || row.admission_no || row.roll_number || '';

    try {
      if (!fullName) throw new Error('full_name is required');
      if (!registrationNumber) throw new Error('registration_number is required');

      const sectionId = row.section ? sectionByName.get(row.section.toLowerCase()) || '' : defaultSectionId;
      if (!sectionId) throw new Error(row.section ? `Section "${row.section}" not found` : 'No section selected');

      const { data: existingEnrollment } = await admin
        .from('college_enrollments')
        .select('id')
        .eq('organization_id', context.organization.id)
        .eq('academic_year_id', academicYearId)
        .eq('registration_number', registrationNumber)
        .maybeSingle();
      if (!existingEnrollment && seatsUsed >= maxStudents) {
        throw new Error(`Student limit reached (${maxStudents}). Upgrade the institution plan to add more.`);
      }

      const email = (row.email || '').trim().toLowerCase() || fallbackEmail(context, registrationNumber);
      const student = await resolveProfile(admin, email, fullName, row.phone || null);
      if (student.password) {
        state.credentials.push({ name: fullName, email, password: student.password, role: 'student' });
      }

      await upsertMembership(admin, context, student.id, 'student');
      const { error: enrollmentError } = await admin.from('college_enrollments').upsert(
        {
          organization_id: context.organization.id,
          academic_year_id: academicYearId,
          section_id: sectionId,
          student_id: student.id,
          registration_number: registrationNumber,
          roll_number: row.roll_number || null,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,academic_year_id,student_id' }
      );
      if (enrollmentError) throw new Error(enrollmentError.message);

      const guardianName = row.guardian_name || row.father_name || '';
      const guardianEmail = (row.guardian_email || '').trim().toLowerCase();
      if (guardianName || guardianEmail) {
        const resolvedGuardianEmail = guardianEmail || fallbackEmail(context, `g-${registrationNumber}`);
        const guardian = await resolveProfile(
          admin,
          resolvedGuardianEmail,
          guardianName || `${fullName} guardian`,
          row.guardian_phone || null
        );
        if (guardian.password) {
          state.credentials.push({
            name: guardianName || `${fullName} guardian`,
            email: resolvedGuardianEmail,
            password: guardian.password,
            role: 'parent',
          });
        }
        await upsertMembership(admin, context, guardian.id, 'parent');
        await admin.from('college_guardians').upsert(
          {
            organization_id: context.organization.id,
            student_id: student.id,
            guardian_id: guardian.id,
            relationship: row.guardian_relationship || 'guardian',
            is_primary: true,
            receives_alerts: true,
          },
          { onConflict: 'organization_id,student_id,guardian_id' }
        );
      }

      if (existingEnrollment) state.updated += 1;
      else {
        state.created += 1;
        seatsUsed += 1;
      }
    } catch (error) {
      state.failed += 1;
      state.errors.push({
        row: line,
        name: fullName || registrationNumber || `Row ${line}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  await finishImport(admin, context, state, 'students');
  return state;
}

export async function importCollegeStaff(_state: CollegeImportState, formData: FormData): Promise<CollegeImportState> {
  let context: CollegeContext;
  let admin: any;
  try {
    ({ context, admin } = await importContext('people'));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Import failed.');
  }

  const { rows } = parseCsv(String(formData.get('csv') || ''));
  if (!rows.length) return fail('The file has no data rows. Add a header row and at least one staff member.');
  if (rows.length > MAX_ROWS) return fail(`Import up to ${MAX_ROWS} staff at a time. Split the file and re-upload.`);

  const state: CollegeImportState = { ...INITIAL_COLLEGE_IMPORT_STATE, errors: [], credentials: [] };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const line = index + 2;
    const fullName = row.full_name || row.name || '';
    const role = (row.role || row.member_role || 'teacher').toLowerCase();

    try {
      if (!fullName) throw new Error('full_name is required');
      if (!STAFF_ROLES.includes(role)) throw new Error(`role must be one of: ${STAFF_ROLES.join(', ')}`);

      const email = (row.email || '').trim().toLowerCase() || fallbackEmail(context, `${fullName}-${line}`);
      const member = await resolveProfile(admin, email, fullName, row.phone || null);
      if (member.password) state.credentials.push({ name: fullName, email, password: member.password, role });

      await upsertMembership(admin, context, member.id, role, {
        employee_code: row.employee_code || null,
        designation: row.designation || null,
      });

      if (member.password) state.created += 1;
      else state.updated += 1;
    } catch (error) {
      state.failed += 1;
      state.errors.push({
        row: line,
        name: fullName || `Row ${line}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  await finishImport(admin, context, state, 'staff');
  return state;
}

async function finishImport(admin: any, context: CollegeContext, state: CollegeImportState, kind: string) {
  const touched = state.created + state.updated;
  if (touched && (await isCollegeOrganizationBillingActive(admin, context.organization.id))) {
    await syncOrganizationCollegeGrants(context.organization.id, true);
  }

  await admin.from('college_audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: context.userId,
    action: 'import',
    entity_type: `${kind}_csv`,
    metadata: { created: state.created, updated: state.updated, failed: state.failed },
  });

  state.success = state.failed === 0 && touched > 0;
  state.message = touched
    ? `${state.created} created, ${state.updated} updated${state.failed ? `, ${state.failed} failed` : ''}.`
    : 'Nothing was imported. Check the errors below.';
  revalidatePath('/college-admin/people');
  revalidatePath('/college-admin');
}
