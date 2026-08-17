'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { getActiveSchoolOrganizationId, getSchoolContext, hasSchoolModule, hasSchoolPermission } from './access';
import type { SchoolModuleKey } from './modules';
import { grantSchoolSubscription, isOrganizationBillingActive } from './subscription-cascade';
import { uploadSchoolLogo } from './storage';
import type { SchoolActionState, SchoolContext, SchoolPermission } from './types';
import { inviteOrFindProfileId } from '@/lib/auth/inviteOrFindProfile';
import { mapInstitutionRoleToProfileRole } from '@/lib/auth/mapInstitutionRoleToProfileRole';

const SUCCESS: SchoolActionState = { success: true, message: 'Saved successfully.' };

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

async function mutationContext(permission: SchoolPermission, action: string, module?: SchoolModuleKey) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const organizationId = await getActiveSchoolOrganizationId();
  const context =
    (organizationId ? await getSchoolContext(supabase, user.id, organizationId) : null) ||
    (await getSchoolContext(supabase, user.id));
  if (!context || !hasSchoolPermission(context, permission))
    throw new Error('You do not have permission for this action.');
  // Hiding a page is not access control — a disabled module must reject the
  // action itself, otherwise a direct POST still writes.
  if (module && !hasSchoolModule(context, module))
    throw new Error('This module is not included in your institution plan.');

  // Operational abuse protection only. It is intentionally independent of
  // the student's FREE/PRO/ELITE learning quotas and does not consume AI credits.
  const limit = await checkDailyLimit(user.id, `erp_mutation:${action}`, 500);
  if (!limit.success)
    throw new Error('Too many school updates today. Try again after the daily security window resets.');
  return { supabase, user, context, db: supabase as any };
}

async function audit(
  db: any,
  context: SchoolContext,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {}
) {
  await db.from('school_audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: context.userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata,
  });
}

function done(path: string, message: string): SchoolActionState {
  revalidatePath('/school-admin', 'layout');
  revalidatePath(path);
  revalidatePath('/school');
  return { success: true, message };
}

function failure(error: unknown): SchoolActionState {
  return { success: false, message: error instanceof Error ? error.message : 'The update could not be completed.' };
}

async function assertStudentLimit(db: any, organizationId: string) {
  const [{ data: plan }, { count }] = await Promise.all([
    db
      .from('school_organization_plan_settings')
      .select('max_students')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    db
      .from('school_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ]);
  const maxStudents = Number(plan?.max_students || 200);
  if ((count || 0) >= maxStudents) {
    throw new Error(
      `Student limit reached (${count || 0}/${maxStudents}). Ask platform admin to increase this school's plan.`
    );
  }
}

export async function updateSchoolOrganization(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const name = text(formData, 'name');
    const timezone = text(formData, 'timezone') || 'Asia/Karachi';
    const currency = text(formData, 'currency').toUpperCase();
    if (name.length < 2 || name.length > 120) throw new Error('School name must be between 2 and 120 characters.');
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code such as PKR.');
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      throw new Error('Enter a valid IANA timezone such as Asia/Karachi.');
    }
    const { db, context } = await mutationContext('organization.manage', 'organization-profile');
    const { error } = await db.rpc('school_update_organization_profile', {
      p_organization_id: context.organization.id,
      p_name: name,
      p_timezone: timezone,
      p_currency: currency,
      p_email: text(formData, 'email'),
      p_phone: text(formData, 'phone'),
      p_address: text(formData, 'address'),
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'update', 'school_organization', context.organization.id);
    return done('/school-admin/settings', 'Organization profile updated.');
  } catch (error) {
    return failure(error);
  }
}

// White-labeling (CLAUDE_CODE_MASTER_PROMPT.md point 7): lets an owner/admin upload a logo that
// then replaces the "ilm AI" mark on every enrolled member's dashboard sidebar — see
// resolveInstitutionBranding() / DashboardSidebar's branding prop.
export async function updateSchoolLogo(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const file = formData.get('logo');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a logo image to upload.');
    if (!file.type.startsWith('image/')) throw new Error('Logo must be an image file.');
    const { db, context } = await mutationContext('organization.manage', 'organization-logo');
    const logoUrl = await uploadSchoolLogo(db, context.organization.id, file);
    const { error } = await db.rpc('school_update_organization_logo', {
      p_organization_id: context.organization.id,
      p_logo_url: logoUrl,
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'update', 'school_organization_logo', context.organization.id);
    return done('/school-admin/settings', 'Logo updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCampus(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const parsed = z.object({ name: z.string().min(2).max(100), code: z.string().min(1).max(20) }).parse({
      name: text(formData, 'name'),
      code: text(formData, 'code').toUpperCase(),
    });
    const { db, context } = await mutationContext('organization.manage', 'campus');
    const { data, error } = await db
      .from('school_campuses')
      .insert({
        organization_id: context.organization.id,
        name: parsed.name,
        code: parsed.code,
        address: optionalText(formData, 'address'),
        phone: optionalText(formData, 'phone'),
        is_main: formData.get('is_main') === 'on',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'campus', data.id);
    return done('/school-admin/academics', 'Campus added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createAcademicYear(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const name = text(formData, 'name');
    const startsOn = dateValue(formData, 'starts_on');
    const endsOn = dateValue(formData, 'ends_on');
    if (!name || !startsOn || !endsOn) throw new Error('Academic year name and dates are required.');
    const { db, context } = await mutationContext('organization.manage', 'academic-year');
    if (formData.get('is_current') === 'on') {
      await db
        .from('school_academic_years')
        .update({ is_current: false })
        .eq('organization_id', context.organization.id);
    }
    const { data, error } = await db
      .from('school_academic_years')
      .insert({
        organization_id: context.organization.id,
        name,
        starts_on: startsOn,
        ends_on: endsOn,
        is_current: formData.get('is_current') === 'on',
        status: formData.get('is_current') === 'on' ? 'active' : 'planning',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'academic_year', data.id);
    return done('/school-admin/academics', 'Academic year added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createSchoolClass(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const name = text(formData, 'name');
    const campusId = text(formData, 'campus_id');
    const academicYearId = text(formData, 'academic_year_id');
    if (!name || !campusId || !academicYearId) throw new Error('Class, campus, and academic year are required.');
    const { db, context } = await mutationContext('organization.manage', 'class');
    const { data, error } = await db
      .from('school_classes')
      .insert({
        organization_id: context.organization.id,
        campus_id: campusId,
        academic_year_id: academicYearId,
        name,
        grade_level: optionalText(formData, 'grade_level'),
        display_order: numberValue(formData, 'display_order'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'class', data.id);
    return done('/school-admin/academics', 'Class added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createSection(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const classId = text(formData, 'class_id');
    const name = text(formData, 'name');
    if (!classId || !name) throw new Error('Class and section name are required.');
    const { db, context } = await mutationContext('organization.manage', 'section');
    const { data, error } = await db
      .from('school_sections')
      .insert({
        organization_id: context.organization.id,
        class_id: classId,
        name,
        room: optionalText(formData, 'room'),
        capacity: Math.max(1, numberValue(formData, 'capacity', 40)),
        homeroom_teacher_id: optionalText(formData, 'homeroom_teacher_id'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'section', data.id);
    return done('/school-admin/academics', 'Section added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createSubjectOffering(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const subjectName = text(formData, 'subject_name');
    if (!sectionId || !subjectName) throw new Error('Section and subject are required.');
    const { db, context } = await mutationContext('academics.manage', 'subject-offering');
    const { data, error } = await db
      .from('school_subject_offerings')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        subject_id: optionalText(formData, 'subject_id'),
        subject_name: subjectName,
        teacher_id: optionalText(formData, 'teacher_id'),
        weekly_periods: Math.max(1, numberValue(formData, 'weekly_periods', 1)),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'subject_offering', data.id);
    return done('/school-admin/academics', 'Subject offering added.');
  } catch (error) {
    return failure(error);
  }
}

export async function addSchoolMember(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const email = text(formData, 'email').toLowerCase();
    const role = text(formData, 'member_role');
    const allowedRoles = ['admin', 'admissions', 'teacher', 'staff', 'accountant', 'parent', 'student'];
    if (!z.string().email().safeParse(email).success || !allowedRoles.includes(role)) {
      throw new Error('A valid registered email and role are required.');
    }
    const { db, context } = await mutationContext('people.manage', 'member', 'people');
    const profile = await inviteOrFindProfileId(email, { profileRole: mapInstitutionRoleToProfileRole(role) });
    const { data, error } = await db
      .from('school_memberships')
      .upsert(
        {
          organization_id: context.organization.id,
          campus_id: optionalText(formData, 'campus_id'),
          profile_id: profile.id,
          member_role: role,
          employee_code: optionalText(formData, 'employee_code'),
          designation: optionalText(formData, 'designation'),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,profile_id,member_role' }
      )
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'upsert', 'membership', data.id, { role });
    if (await isOrganizationBillingActive(db, context.organization.id)) {
      await grantSchoolSubscription(context.organization.id, profile.id);
    }
    return done(
      '/school-admin/people',
      profile.invited ? 'School member added. An invite email was sent to set their password.' : 'School member added.'
    );
  } catch (error) {
    return failure(error);
  }
}

export async function enrollStudent(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const studentEmail = text(formData, 'student_email').toLowerCase();
    const sectionId = text(formData, 'section_id');
    const academicYearId = text(formData, 'academic_year_id');
    const admissionNumber = text(formData, 'admission_number');
    if (!studentEmail || !sectionId || !academicYearId || !admissionNumber) {
      throw new Error('Student email, section, academic year, and admission number are required.');
    }
    const { db, context } = await mutationContext('admissions.manage', 'enrollment', 'people');
    const { data: profile } = await db.from('profiles').select('id').eq('email', studentEmail).maybeSingle();
    if (!profile) throw new Error('The student must register an ilm AI account first.');
    const { data: existingActive } = await db
      .from('school_enrollments')
      .select('id')
      .eq('organization_id', context.organization.id)
      .eq('student_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!existingActive) await assertStudentLimit(db, context.organization.id);
    await db.from('school_memberships').upsert(
      {
        organization_id: context.organization.id,
        profile_id: profile.id,
        member_role: 'student',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,profile_id,member_role' }
    );
    const { data, error } = await db
      .from('school_enrollments')
      .upsert(
        {
          organization_id: context.organization.id,
          academic_year_id: academicYearId,
          section_id: sectionId,
          student_id: profile.id,
          admission_number: admissionNumber,
          roll_number: optionalText(formData, 'roll_number'),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,academic_year_id,student_id' }
      )
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'upsert', 'enrollment', data.id, { studentId: profile.id });
    if (await isOrganizationBillingActive(db, context.organization.id)) {
      await grantSchoolSubscription(context.organization.id, profile.id);
    }
    return done('/school-admin/people', 'Student enrolled.');
  } catch (error) {
    return failure(error);
  }
}

export async function upsertStaffCompensation(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const membershipId = text(formData, 'membership_id');
    const baseSalary = numberValue(formData, 'base_salary');
    const effectiveFrom = dateValue(formData, 'effective_from') || new Date().toISOString().slice(0, 10);
    if (!membershipId || baseSalary < 0) throw new Error('Staff member and salary are required.');
    const { db, context, user } = await mutationContext('payroll.manage', 'staff-compensation', 'payroll');
    const { data, error } = await db
      .from('school_staff_compensation')
      .insert({
        organization_id: context.organization.id,
        membership_id: membershipId,
        base_salary: baseSalary,
        currency: text(formData, 'currency') || context.organization.currency,
        pay_frequency: text(formData, 'pay_frequency') || 'monthly',
        bank_account_title: optionalText(formData, 'bank_account_title'),
        bank_account_number: optionalText(formData, 'bank_account_number'),
        wallet_number: optionalText(formData, 'wallet_number'),
        notes: optionalText(formData, 'notes'),
        effective_from: effectiveFrom,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'upsert', 'staff_compensation', data.id, { membershipId, baseSalary });
    return done('/school-admin/payroll', 'Staff salary saved.');
  } catch (error) {
    return failure(error);
  }
}

export async function createPayrollRun(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const payrollMonth = dateValue(formData, 'payroll_month');
    if (!payrollMonth) throw new Error('Payroll month is required.');
    const { db, context, user } = await mutationContext('payroll.manage', 'payroll-run', 'payroll');
    const { data: compensationRows, error: compensationError } = await db
      .from('school_staff_compensation')
      .select('membership_id, base_salary')
      .eq('organization_id', context.organization.id)
      .eq('is_active', true);
    if (compensationError) throw new Error(compensationError.message);
    const grossAmount = (compensationRows || []).reduce(
      (sum: number, row: any) => sum + Number(row.base_salary || 0),
      0
    );
    const { data: run, error } = await db
      .from('school_payroll_runs')
      .insert({
        organization_id: context.organization.id,
        payroll_month: payrollMonth,
        gross_amount: grossAmount,
        net_amount: grossAmount,
        notes: optionalText(formData, 'notes'),
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    if (compensationRows?.length) {
      const { error: itemsError } = await db.from('school_payroll_items').insert(
        compensationRows.map((row: any) => ({
          organization_id: context.organization.id,
          payroll_run_id: run.id,
          membership_id: row.membership_id,
          base_salary: Number(row.base_salary || 0),
          net_amount: Number(row.base_salary || 0),
        }))
      );
      if (itemsError) throw new Error(itemsError.message);
    }
    await audit(db, context, 'create', 'payroll_run', run.id, { payrollMonth, grossAmount });
    return done('/school-admin/payroll', 'Payroll run created.');
  } catch (error) {
    return failure(error);
  }
}

export async function updatePayrollItem(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const bonus = Math.max(0, numberValue(formData, 'bonus_amount'));
    const deduction = Math.max(0, numberValue(formData, 'deduction_amount'));
    const status = text(formData, 'payment_status') || 'unpaid';
    if (!id || !['unpaid', 'paid', 'held', 'cancelled'].includes(status))
      throw new Error('Payroll item and status are required.');
    const { db, context } = await mutationContext('payroll.manage', 'payroll-item', 'payroll');
    const { data: item } = await db
      .from('school_payroll_items')
      .select('base_salary')
      .eq('organization_id', context.organization.id)
      .eq('id', id)
      .maybeSingle();
    if (!item) throw new Error('Payroll item not found.');
    const netAmount = Math.max(0, Number(item.base_salary || 0) + bonus - deduction);
    const { error } = await db
      .from('school_payroll_items')
      .update({
        bonus_amount: bonus,
        deduction_amount: deduction,
        net_amount: netAmount,
        payment_status: status,
        payment_method: optionalText(formData, 'payment_method'),
        payment_reference: optionalText(formData, 'payment_reference'),
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        notes: optionalText(formData, 'notes'),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', context.organization.id)
      .eq('id', id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'update', 'payroll_item', id, { status, netAmount });
    return done('/school-admin/payroll', 'Payroll item updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function linkGuardian(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const studentId = text(formData, 'student_id');
    const guardianEmail = text(formData, 'guardian_email').toLowerCase();
    if (!studentId || !z.string().email().safeParse(guardianEmail).success)
      throw new Error('Student and guardian email are required.');
    const { db, context } = await mutationContext('people.manage', 'guardian', 'people');
    const { data: profile } = await db.from('profiles').select('id').eq('email', guardianEmail).maybeSingle();
    if (!profile) throw new Error('The guardian must register an ilm AI account first.');
    await db.from('school_memberships').upsert(
      {
        organization_id: context.organization.id,
        profile_id: profile.id,
        member_role: 'parent',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,profile_id,member_role' }
    );
    const { data, error } = await db
      .from('school_guardians')
      .upsert(
        {
          organization_id: context.organization.id,
          student_id: studentId,
          guardian_id: profile.id,
          relationship: text(formData, 'relationship') || 'guardian',
          is_primary: formData.get('is_primary') === 'on',
          receives_alerts: true,
        },
        { onConflict: 'organization_id,student_id,guardian_id' }
      )
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'upsert', 'guardian_link', data.id);
    return done('/school-admin/people', 'Guardian linked.');
  } catch (error) {
    return failure(error);
  }
}

export async function createAdmission(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const applicantName = text(formData, 'applicant_name');
    const applyingForClass = text(formData, 'applying_for_class');
    const guardianName = text(formData, 'guardian_name');
    const guardianPhone = text(formData, 'guardian_phone');
    if (!applicantName || !applyingForClass || !guardianName || !guardianPhone) {
      throw new Error('Applicant, class, guardian, and phone are required.');
    }
    const { db, context } = await mutationContext('admissions.manage', 'admission', 'admissions');
    const applicationNumber = text(formData, 'application_number') || `APP-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await db
      .from('school_admissions')
      .insert({
        organization_id: context.organization.id,
        campus_id: optionalText(formData, 'campus_id'),
        academic_year_id: optionalText(formData, 'academic_year_id'),
        application_number: applicationNumber,
        applicant_name: applicantName,
        date_of_birth: dateValue(formData, 'date_of_birth') || null,
        gender: optionalText(formData, 'gender'),
        applying_for_class: applyingForClass,
        guardian_name: guardianName,
        guardian_email: optionalText(formData, 'guardian_email'),
        guardian_phone: guardianPhone,
        previous_school: optionalText(formData, 'previous_school'),
        notes: optionalText(formData, 'notes'),
        status: 'submitted',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'admission', data.id, { applicationNumber });
    return done('/school-admin/admissions', `Application ${applicationNumber} created.`);
  } catch (error) {
    return failure(error);
  }
}

export async function updateAdmissionStatus(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    const statuses = ['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'];
    if (!id || !statuses.includes(status)) throw new Error('Application and valid status are required.');
    const { db, context, user } = await mutationContext('admissions.manage', 'admission-status', 'admissions');
    const { error } = await db
      .from('school_admissions')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'status_change', 'admission', id, { status });
    return done('/school-admin/admissions', 'Admission status updated.');
  } catch (error) {
    return failure(error);
  }
}

type AttendanceInput = { studentId: string; status: string; remarks?: string };

export async function saveAttendance(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const attendanceDate = dateValue(formData, 'attendance_date');
    const entries = JSON.parse(text(formData, 'entries') || '[]') as AttendanceInput[];
    if (!sectionId || !attendanceDate || !entries.length)
      throw new Error('Section, date, and at least one attendance entry are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'attendance', 'attendance');
    const allowed = new Set(['present', 'absent', 'late', 'excused', 'leave']);
    const records = entries
      .filter((entry) => entry.studentId && allowed.has(entry.status))
      .map((entry) => ({
        organization_id: context.organization.id,
        section_id: sectionId,
        student_id: entry.studentId,
        attendance_date: attendanceDate,
        status: entry.status,
        remarks: entry.remarks?.slice(0, 300) || null,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    if (!records.length) throw new Error('No valid attendance entries were provided.');
    const { error } = await db.from('school_attendance_records').upsert(records, {
      onConflict: 'section_id,student_id,attendance_date',
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'attendance', sectionId, { attendanceDate, count: records.length });
    return done('/school-admin/attendance', `${records.length} attendance records saved.`);
  } catch (error) {
    return failure(error);
  }
}

// New-student detection from the attendance scan pipeline (Part 4.2): a name/roll number the OCR
// pass finds with no matching enrollment gets reported here instead of silently discarded.
export async function requestNewStudentAddition(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const extractedName = text(formData, 'extracted_name');
    const extractedRollNumber = optionalText(formData, 'extracted_roll_number');
    if (!sectionId || !extractedName) throw new Error('Section and student name are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'pending-student-addition', 'attendance');
    const { error } = await db.from('school_pending_student_additions').upsert(
      {
        organization_id: context.organization.id,
        section_id: sectionId,
        extracted_name: extractedName.slice(0, 200),
        extracted_roll_number: extractedRollNumber?.slice(0, 50) || null,
        detected_by: user.id,
        status: 'pending_principal_approval',
      },
      { onConflict: 'section_id,extracted_name,extracted_roll_number' }
    );
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'pending_student_addition', null, { sectionId, extractedName });
    return done('/school-admin/requests', `Reported "${extractedName}" to the principal for approval.`);
  } catch (error) {
    return failure(error);
  }
}

export async function reviewPendingStudentAddition(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !['approved', 'rejected'].includes(status)) throw new Error('Request and decision are required.');
    const { db, context, user } = await mutationContext('people.manage', 'pending-student-review', 'people');
    const { error } = await db
      .from('school_pending_student_additions')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'review', 'pending_student_addition', id, { status });
    // Deliberately does not auto-create an enrollment: a scan-detected name has no linked account
    // or guardian details yet (school_admissions requires guardian_name/guardian_phone NOT NULL —
    // see the migration's header comment for why this couldn't just extend that table). Approval
    // means "yes, go enroll them" — the admissions/people team still completes it via the existing
    // Enroll student form once the family provides an account.
    return done(
      '/school-admin/requests',
      status === 'approved'
        ? 'Approved — enroll this student from People once their account/guardian details are collected.'
        : 'Rejected.'
    );
  } catch (error) {
    return failure(error);
  }
}

type StaffAttendanceInput = { membershipId: string; status: string };

export async function saveStaffAttendance(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const attendanceDate = dateValue(formData, 'attendance_date');
    const entries = JSON.parse(text(formData, 'entries') || '[]') as StaffAttendanceInput[];
    if (!attendanceDate || !entries.length) throw new Error('Date and staff attendance entries are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'staff-attendance', 'attendance');
    if (!['owner', 'admin'].includes(context.membership.member_role)) {
      throw new Error('Only school owners and administrators can mark staff attendance.');
    }
    const allowed = new Set(['present', 'absent', 'late', 'remote', 'leave']);
    const records = entries
      .filter((entry) => entry.membershipId && allowed.has(entry.status))
      .map((entry) => ({
        organization_id: context.organization.id,
        membership_id: entry.membershipId,
        attendance_date: attendanceDate,
        status: entry.status,
        marked_by: user.id,
      }));
    const { error } = await db.from('school_staff_attendance').upsert(records, {
      onConflict: 'membership_id,attendance_date',
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'staff_attendance', null, { attendanceDate, count: records.length });
    return done('/school-admin/attendance', `${records.length} staff attendance records saved.`);
  } catch (error) {
    return failure(error);
  }
}

export async function createLeaveRequest(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const startsOn = dateValue(formData, 'starts_on');
    const endsOn = dateValue(formData, 'ends_on');
    const reason = text(formData, 'reason');
    if (!startsOn || !endsOn || !reason) throw new Error('Leave dates and reason are required.');
    const { db, context, user } = await mutationContext('attendance.read', 'leave-request', 'attendance');
    const role = context.membership.member_role;
    let requesterId = user.id;
    let requesterType = role === 'teacher' ? 'teacher' : role === 'staff' ? 'staff' : 'student';
    if (role === 'parent') {
      requesterId = text(formData, 'student_id');
      if (!requesterId) throw new Error('Select a student.');
      const { data: relationship } = await db
        .from('school_guardians')
        .select('id')
        .eq('organization_id', context.organization.id)
        .eq('guardian_id', user.id)
        .eq('student_id', requesterId)
        .maybeSingle();
      if (!relationship) throw new Error('You can only request leave for a linked student.');
      requesterType = 'student';
    }
    if (!['student', 'parent', 'teacher', 'staff'].includes(role)) {
      throw new Error('Leave requests are available to students and staff.');
    }
    const { data, error } = await db
      .from('school_leave_requests')
      .insert({
        organization_id: context.organization.id,
        requester_id: requesterId,
        requester_type: requesterType,
        starts_on: startsOn,
        ends_on: endsOn,
        reason: reason.slice(0, 1000),
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'leave_request', data.id, { requesterId });
    return done('/school', 'Leave request submitted.');
  } catch (error) {
    return failure(error);
  }
}

export async function reviewLeaveRequest(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !['approved', 'rejected'].includes(status)) throw new Error('Leave request and decision are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'leave-review', 'attendance');
    const { error } = await db
      .from('school_leave_requests')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'review', 'leave_request', id, { status });
    return done('/school-admin/attendance', 'Leave request updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function createExam(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const name = text(formData, 'name');
    const academicYearId = text(formData, 'academic_year_id');
    const startsOn = dateValue(formData, 'starts_on');
    const endsOn = dateValue(formData, 'ends_on');
    if (!name || !academicYearId || !startsOn || !endsOn) throw new Error('Exam name, year, and dates are required.');
    const { db, context, user } = await mutationContext('exams.manage', 'exam', 'exams');
    const { data, error } = await db
      .from('school_exams')
      .insert({
        organization_id: context.organization.id,
        academic_year_id: academicYearId,
        name,
        term: optionalText(formData, 'term'),
        starts_on: startsOn,
        ends_on: endsOn,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'exam', data.id);
    return done('/school-admin/exams', 'Exam created.');
  } catch (error) {
    return failure(error);
  }
}

export async function createExamSchedule(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const examId = text(formData, 'exam_id');
    const sectionId = text(formData, 'section_id');
    const subjectName = text(formData, 'subject_name');
    const examDate = dateValue(formData, 'exam_date');
    if (!examId || !sectionId || !subjectName || !examDate)
      throw new Error('Exam, section, subject, and date are required.');
    const { db, context } = await mutationContext('exams.manage', 'exam-schedule', 'exams');
    const { data, error } = await db
      .from('school_exam_schedules')
      .insert({
        organization_id: context.organization.id,
        exam_id: examId,
        section_id: sectionId,
        subject_offering_id: optionalText(formData, 'subject_offering_id'),
        subject_name: subjectName,
        exam_date: examDate,
        starts_at: optionalText(formData, 'starts_at'),
        ends_at: optionalText(formData, 'ends_at'),
        room: optionalText(formData, 'room'),
        max_marks: Math.max(1, numberValue(formData, 'max_marks', 100)),
        passing_marks: Math.max(0, numberValue(formData, 'passing_marks', 40)),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'exam_schedule', data.id);
    return done('/school-admin/exams', 'Date-sheet entry added.');
  } catch (error) {
    return failure(error);
  }
}

type DateSheetEntryInput = {
  sectionId: string;
  subjectName: string;
  examDate: string;
  startsAt?: string | null;
  endsAt?: string | null;
  room?: string | null;
  maxMarks?: number;
  passingMarks?: number;
};

// Bulk write for the guided date-sheet wizard (Part 4.1): the principal answers one exam slot at a
// time client-side, then this saves the whole accumulated date sheet in one submission — same
// underlying table/constraint as createExamSchedule above, just batched.
export async function createExamScheduleBatch(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const examId = text(formData, 'exam_id');
    const entries = JSON.parse(text(formData, 'entries') || '[]') as DateSheetEntryInput[];
    if (!examId || !entries.length) throw new Error('An exam and at least one exam slot are required.');
    const { db, context } = await mutationContext('exams.manage', 'exam-schedule-batch', 'exams');

    const records = entries
      .filter((entry) => entry.sectionId && entry.subjectName && entry.examDate)
      .map((entry) => ({
        organization_id: context.organization.id,
        exam_id: examId,
        section_id: entry.sectionId,
        subject_name: entry.subjectName.slice(0, 200),
        exam_date: entry.examDate,
        starts_at: entry.startsAt || null,
        ends_at: entry.endsAt || null,
        room: entry.room?.slice(0, 100) || null,
        max_marks: Math.max(1, Number(entry.maxMarks) || 100),
        passing_marks: Math.max(0, Number(entry.passingMarks) || 40),
      }));
    if (!records.length) throw new Error('No valid exam slots were provided.');

    const { error } = await db.from('school_exam_schedules').upsert(records, { onConflict: 'exam_id,section_id,subject_name' });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'exam_schedule', examId, { count: records.length });
    return done('/school-admin/exams', `Date sheet saved — ${records.length} exam slot${records.length === 1 ? '' : 's'}.`);
  } catch (error) {
    return failure(error);
  }
}

type MarkInput = { studentId: string; marks: number | null; absent?: boolean; remarks?: string };

export async function saveExamMarks(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const scheduleId = text(formData, 'schedule_id');
    const entries = JSON.parse(text(formData, 'entries') || '[]') as MarkInput[];
    if (!scheduleId || !entries.length) throw new Error('Exam schedule and marks are required.');
    const { db, context, user } = await mutationContext('exams.manage', 'exam-marks', 'exams');
    const { data: schedule } = await db
      .from('school_exam_schedules')
      .select('max_marks')
      .eq('id', scheduleId)
      .maybeSingle();
    if (!schedule) throw new Error('Exam schedule was not found.');
    const records = entries.map((entry) => {
      const marks = Number(entry.marks);
      if (!entry.absent && (!Number.isFinite(marks) || marks < 0 || marks > Number(schedule.max_marks))) {
        throw new Error(`Marks must be between 0 and ${schedule.max_marks}.`);
      }
      return {
        organization_id: context.organization.id,
        schedule_id: scheduleId,
        student_id: entry.studentId,
        marks_obtained: entry.absent ? null : marks,
        is_absent: Boolean(entry.absent),
        remarks: entry.remarks?.slice(0, 300) || null,
        entered_by: user.id,
        entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await db.from('school_exam_marks').upsert(records, { onConflict: 'schedule_id,student_id' });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'exam_marks', scheduleId, { count: records.length });
    return done('/school-admin/exams', `${records.length} marks saved.`);
  } catch (error) {
    return failure(error);
  }
}

function gradeFor(percentage: number) {
  if (percentage >= 90) return { grade: 'A+', gpa: 4 };
  if (percentage >= 80) return { grade: 'A', gpa: 3.7 };
  if (percentage >= 70) return { grade: 'B', gpa: 3 };
  if (percentage >= 60) return { grade: 'C', gpa: 2 };
  if (percentage >= 50) return { grade: 'D', gpa: 1 };
  return { grade: 'F', gpa: 0 };
}

export async function publishExamResults(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const examId = text(formData, 'exam_id');
    if (!examId) throw new Error('Exam is required.');
    const { db, context } = await mutationContext('exams.manage', 'publish-results', 'exams');
    const { data: schedules } = await db
      .from('school_exam_schedules')
      .select('id, max_marks, subject_name')
      .eq('exam_id', examId)
      .eq('organization_id', context.organization.id);
    if (!schedules?.length) throw new Error('Add date-sheet subjects before publishing results.');
    const scheduleIds = schedules.map((item: any) => item.id);
    const { data: marks } = await db
      .from('school_exam_marks')
      .select('student_id, schedule_id, marks_obtained, is_absent')
      .in('schedule_id', scheduleIds);
    if (!marks?.length) throw new Error('Enter marks before publishing results.');

    const scheduleMap = new Map<string, any>(schedules.map((item: any) => [item.id, item]));
    const summaries = new Map<string, { total: number; obtained: number; subjects: any[] }>();
    for (const mark of marks) {
      const schedule = scheduleMap.get(mark.schedule_id);
      if (!schedule) continue;
      const current = summaries.get(mark.student_id) || { total: 0, obtained: 0, subjects: [] };
      current.total += Number(schedule.max_marks);
      current.obtained += Number(mark.marks_obtained || 0);
      current.subjects.push({
        subject: schedule.subject_name,
        maxMarks: Number(schedule.max_marks),
        marks: mark.is_absent ? null : Number(mark.marks_obtained || 0),
        absent: mark.is_absent,
      });
      summaries.set(mark.student_id, current);
    }
    const ranked = [...summaries.entries()]
      .map(([studentId, value]) => ({
        studentId,
        ...value,
        percentage: value.total ? Math.round((value.obtained / value.total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
    const publishedAt = new Date().toISOString();
    const reportCards = ranked.map((item, index) => {
      const rating = gradeFor(item.percentage);
      return {
        organization_id: context.organization.id,
        exam_id: examId,
        student_id: item.studentId,
        summary: { subjects: item.subjects },
        total_marks: item.total,
        obtained_marks: item.obtained,
        percentage: item.percentage,
        gpa: rating.gpa,
        grade: rating.grade,
        class_position: index + 1,
        published_at: publishedAt,
        generated_at: publishedAt,
      };
    });
    const { error } = await db.from('school_report_cards').upsert(reportCards, { onConflict: 'exam_id,student_id' });
    if (error) throw new Error(error.message);
    await db.from('school_exams').update({ status: 'published', published_at: publishedAt }).eq('id', examId);
    await audit(db, context, 'publish', 'exam_results', examId, { students: reportCards.length });
    return done('/school-admin/exams', `${reportCards.length} report cards published.`);
  } catch (error) {
    return failure(error);
  }
}

export async function createFeeStructure(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const name = text(formData, 'name');
    const academicYearId = text(formData, 'academic_year_id');
    const amount = numberValue(formData, 'amount', -1);
    if (!name || !academicYearId || amount < 0) throw new Error('Name, academic year, and valid amount are required.');
    const { db, context } = await mutationContext('fees.manage', 'fee-structure', 'fees');
    const { data, error } = await db
      .from('school_fee_structures')
      .insert({
        organization_id: context.organization.id,
        academic_year_id: academicYearId,
        class_id: optionalText(formData, 'class_id'),
        name,
        fee_type: text(formData, 'fee_type') || 'tuition',
        frequency: text(formData, 'frequency') || 'monthly',
        amount,
        due_day: numberValue(formData, 'due_day', 10),
        late_fee_type: text(formData, 'late_fee_type') || 'fixed',
        late_fee_amount: Math.max(0, numberValue(formData, 'late_fee_amount')),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'fee_structure', data.id);
    return done('/school-admin/fees', 'Fee structure added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createFeeInvoice(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const studentId = text(formData, 'student_id');
    const academicYearId = text(formData, 'academic_year_id');
    const dueDate = dateValue(formData, 'due_date');
    const subtotal = numberValue(formData, 'subtotal', -1);
    if (!studentId || !academicYearId || !dueDate || subtotal < 0)
      throw new Error('Student, year, due date, and amount are required.');
    const { db, context, user } = await mutationContext('fees.manage', 'fee-invoice', 'fees');
    const voucherNumber = text(formData, 'voucher_number') || `V-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await db
      .from('school_fee_invoices')
      .insert({
        organization_id: context.organization.id,
        academic_year_id: academicYearId,
        student_id: studentId,
        fee_structure_id: optionalText(formData, 'fee_structure_id'),
        voucher_number: voucherNumber,
        billing_period: optionalText(formData, 'billing_period'),
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate,
        subtotal,
        discount_amount: Math.max(0, numberValue(formData, 'discount_amount')),
        scholarship_amount: Math.max(0, numberValue(formData, 'scholarship_amount')),
        fine_amount: Math.max(0, numberValue(formData, 'fine_amount')),
        status: 'issued',
        notes: optionalText(formData, 'notes'),
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'fee_invoice', data.id, { voucherNumber });
    return done('/school-admin/fees', `Voucher ${voucherNumber} issued.`);
  } catch (error) {
    return failure(error);
  }
}

export async function recordFeePayment(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const invoiceId = text(formData, 'invoice_id');
    const amount = numberValue(formData, 'amount', -1);
    if (!invoiceId || amount <= 0) throw new Error('Invoice and payment amount are required.');
    const { db, context, user } = await mutationContext('fees.manage', 'fee-payment', 'fees');
    const receiptNumber = text(formData, 'receipt_number') || `R-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await db
      .from('school_fee_payments')
      .insert({
        organization_id: context.organization.id,
        invoice_id: invoiceId,
        amount,
        payment_method: text(formData, 'payment_method') || 'cash',
        provider: optionalText(formData, 'provider'),
        provider_reference: optionalText(formData, 'provider_reference'),
        receipt_number: receiptNumber,
        received_by: user.id,
        notes: optionalText(formData, 'notes'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'fee_payment', data.id, { receiptNumber, amount });
    return done('/school-admin/fees', `Payment recorded as ${receiptNumber}.`);
  } catch (error) {
    return failure(error);
  }
}

export async function createHomework(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const title = text(formData, 'title');
    if (!sectionId || !title) throw new Error('Section and title are required.');
    const { db, context, user } = await mutationContext('academics.manage', 'homework', 'academics');
    const { data, error } = await db
      .from('school_homework')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        subject_offering_id: optionalText(formData, 'subject_offering_id'),
        title,
        instructions: optionalText(formData, 'instructions'),
        attachment_url: optionalText(formData, 'attachment_url'),
        due_at: optionalText(formData, 'due_at'),
        max_marks: numberValue(formData, 'max_marks') || null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'homework', data.id);
    return done('/school-admin/academics', 'Homework assigned.');
  } catch (error) {
    return failure(error);
  }
}

export async function createLessonPlan(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const subjectOfferingId = text(formData, 'subject_offering_id');
    const title = text(formData, 'title');
    const lessonDate = dateValue(formData, 'lesson_date');
    const status = text(formData, 'status') || 'draft';
    if (!subjectOfferingId || !title || !lessonDate) {
      throw new Error('Subject, lesson title, and date are required.');
    }
    if (!['draft', 'ready', 'delivered', 'reviewed'].includes(status)) throw new Error('Invalid lesson status.');
    const { db, context, user } = await mutationContext('academics.manage', 'lesson-plan', 'academics');
    const resources = text(formData, 'resources')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
    const { data, error } = await db
      .from('school_lesson_plans')
      .insert({
        organization_id: context.organization.id,
        subject_offering_id: subjectOfferingId,
        title,
        objectives: optionalText(formData, 'objectives'),
        lesson_date: lessonDate,
        content: optionalText(formData, 'content'),
        resources,
        status,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'lesson_plan', data.id);
    return done('/school-admin/academics', 'Lesson plan added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createTimetableEntry(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const subjectName = text(formData, 'subject_name');
    const startsAt = text(formData, 'starts_at');
    const endsAt = text(formData, 'ends_at');
    if (!sectionId || !subjectName || !startsAt || !endsAt)
      throw new Error('Section, subject, and times are required.');
    const { db, context } = await mutationContext('academics.manage', 'timetable', 'academics');
    const { data, error } = await db
      .from('school_timetable_entries')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        subject_offering_id: optionalText(formData, 'subject_offering_id'),
        subject_name: subjectName,
        teacher_id: optionalText(formData, 'teacher_id'),
        day_of_week: Math.min(7, Math.max(1, numberValue(formData, 'day_of_week', 1))),
        starts_at: startsAt,
        ends_at: endsAt,
        room: optionalText(formData, 'room'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'timetable_entry', data.id);
    return done('/school-admin/academics', 'Timetable entry added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCalendarEvent(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const title = text(formData, 'title');
    const startsAt = text(formData, 'starts_at');
    if (!title || !startsAt) throw new Error('Event title and start time are required.');
    const { db, context, user } = await mutationContext('academics.manage', 'calendar-event', 'academics');
    const { data, error } = await db
      .from('school_calendar_events')
      .insert({
        organization_id: context.organization.id,
        campus_id: optionalText(formData, 'campus_id'),
        title,
        description: optionalText(formData, 'description'),
        event_type: text(formData, 'event_type') || 'academic',
        starts_at: startsAt,
        ends_at: optionalText(formData, 'ends_at'),
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'calendar_event', data.id);
    return done('/school-admin/academics', 'Calendar event added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createAnnouncement(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const title = text(formData, 'title');
    const body = text(formData, 'body');
    if (!title || !body) throw new Error('Announcement title and message are required.');
    const roles = formData.getAll('audience_roles').map(String);
    const channels = formData.getAll('delivery_channels').map(String);
    const { db, context, user } = await mutationContext('communication.manage', 'announcement', 'communication');
    const publishedAt = formData.get('publish_now') === 'on' ? new Date().toISOString() : null;
    const { data, error } = await db
      .from('school_announcements')
      .insert({
        organization_id: context.organization.id,
        campus_id: optionalText(formData, 'campus_id'),
        title,
        body,
        priority: text(formData, 'priority') || 'normal',
        audience_roles: roles.length ? roles : ['student', 'parent', 'teacher', 'staff'],
        delivery_channels: channels.length ? channels : ['in_app'],
        published_at: publishedAt,
        expires_at: optionalText(formData, 'expires_at'),
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    if (publishedAt) {
      const { data: recipients } = await db
        .from('school_memberships')
        .select('profile_id, member_role, profiles(email, phone)')
        .eq('organization_id', context.organization.id)
        .eq('status', 'active')
        .in('member_role', roles.length ? roles : ['student', 'parent', 'teacher', 'staff']);
      const deliveries = (recipients || []).flatMap((recipient: any) =>
        (channels.length ? channels : ['in_app']).map((channel) => {
          const profile = Array.isArray(recipient.profiles) ? recipient.profiles[0] : recipient.profiles;
          return {
            organization_id: context.organization.id,
            announcement_id: data.id,
            recipient_id: recipient.profile_id,
            recipient_address:
              channel === 'email'
                ? profile?.email || null
                : channel === 'sms' || channel === 'whatsapp'
                  ? profile?.phone || null
                  : null,
            channel,
            status: 'queued',
          };
        })
      );
      if (deliveries.length) await db.from('school_notification_deliveries').insert(deliveries);
    }
    await audit(db, context, 'create', 'announcement', data.id, { published: Boolean(publishedAt) });
    return done(
      '/school-admin/communication',
      publishedAt ? 'Announcement published and delivery queued.' : 'Announcement saved as draft.'
    );
  } catch (error) {
    return failure(error);
  }
}

export async function publishAnnouncement(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    if (!id) throw new Error('Announcement is required.');
    const { db, context } = await mutationContext('communication.manage', 'announcement-publish', 'communication');
    const { data: announcement, error } = await db
      .from('school_announcements')
      .select('id, audience_roles, delivery_channels, published_at')
      .eq('id', id)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    if (error || !announcement) throw new Error(error?.message || 'Announcement not found.');
    if (announcement.published_at) return done('/school-admin/communication', 'Announcement is already published.');
    const publishedAt = new Date().toISOString();
    const { error: publishError } = await db
      .from('school_announcements')
      .update({
        published_at: publishedAt,
      })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (publishError) throw new Error(publishError.message);

    const { data: recipients } = await db
      .from('school_memberships')
      .select('profile_id, profiles(email, phone)')
      .eq('organization_id', context.organization.id)
      .eq('status', 'active')
      .in('member_role', announcement.audience_roles);
    const deliveries = (recipients || []).flatMap((recipient: any) => {
      const profile = Array.isArray(recipient.profiles) ? recipient.profiles[0] : recipient.profiles;
      return (announcement.delivery_channels || ['in_app']).map((channel: string) => ({
        organization_id: context.organization.id,
        announcement_id: id,
        recipient_id: recipient.profile_id,
        recipient_address:
          channel === 'email'
            ? profile?.email || null
            : channel === 'sms' || channel === 'whatsapp'
              ? profile?.phone || null
              : null,
        channel,
        status: 'queued',
      }));
    });
    if (deliveries.length) {
      const { error: deliveryError } = await db.from('school_notification_deliveries').insert(deliveries);
      if (deliveryError) throw new Error(deliveryError.message);
    }
    await audit(db, context, 'publish', 'announcement', id, { deliveries: deliveries.length });
    return done('/school-admin/communication', 'Announcement published and delivery queued.');
  } catch (error) {
    return failure(error);
  }
}

export async function createSchoolContactMessage(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const subject = text(formData, 'subject');
    const body = text(formData, 'body');
    const recipientRole = text(formData, 'recipient_role') || 'admin';
    if (!subject || !body) throw new Error('Subject and message are required.');
    if (!['admin', 'admissions', 'teacher', 'accountant'].includes(recipientRole)) {
      throw new Error('Invalid recipient team.');
    }
    const { db, context, user } = await mutationContext('communication.read', 'contact-message', 'communication');
    const { data, error } = await db
      .from('school_contact_messages')
      .insert({
        organization_id: context.organization.id,
        sender_id: user.id,
        recipient_role: recipientRole,
        subject: subject.slice(0, 160),
        body: body.slice(0, 3000),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'contact_message', data.id, { recipientRole });
    return done('/school', 'Message sent to the school.');
  } catch (error) {
    return failure(error);
  }
}

export async function respondSchoolContactMessage(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const response = text(formData, 'response');
    const status = text(formData, 'status') || 'replied';
    if (!id || !response) throw new Error('Message and response are required.');
    if (!['replied', 'closed'].includes(status)) throw new Error('Invalid response status.');
    const { db, context, user } = await mutationContext('communication.read', 'contact-response', 'communication');
    const { error } = await db
      .from('school_contact_messages')
      .update({
        response: response.slice(0, 3000),
        status,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'respond', 'contact_message', id, { status });
    return done('/school-admin/communication', 'Response saved.');
  } catch (error) {
    return failure(error);
  }
}

// --- Online PTM (parent-teacher meetings) ------------------------------

export async function createPtmSlot(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const startsAt = text(formData, 'starts_at');
    const endsAt = text(formData, 'ends_at');
    if (!startsAt || !endsAt) throw new Error('Start and end time are required.');
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime())
      throw new Error('End time must be after the start time.');
    const { db, context, user } = await mutationContext('ptm.manage', 'ptm-slot', 'ptm');
    const role = context.membership.member_role;
    let teacherId = user.id;
    if (['owner', 'admin'].includes(role)) {
      teacherId = optionalText(formData, 'teacher_id') || user.id;
    } else if (role !== 'teacher') {
      throw new Error('Only teachers or school admins can open PTM availability.');
    }
    const { data, error } = await db
      .from('school_ptm_slots')
      .insert({
        organization_id: context.organization.id,
        teacher_id: teacherId,
        starts_at: startsAt,
        ends_at: endsAt,
        meeting_mode: text(formData, 'meeting_mode') === 'in_person' ? 'in_person' : 'online',
        location: optionalText(formData, 'location'),
        max_participants: Math.max(1, numberValue(formData, 'max_participants', 1)),
        notes: optionalText(formData, 'notes'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'ptm_slot', data.id);
    return done('/school-admin/ptm', 'Availability slot added.');
  } catch (error) {
    return failure(error);
  }
}

export async function closePtmSlot(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    if (!id) throw new Error('Slot is required.');
    const { db, context } = await mutationContext('ptm.manage', 'ptm-slot-close', 'ptm');
    let query = db
      .from('school_ptm_slots')
      .update({ is_open: false })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (context.membership.member_role === 'teacher') query = query.eq('teacher_id', context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    await audit(db, context, 'close', 'ptm_slot', id);
    return done('/school-admin/ptm', 'Slot closed.');
  } catch (error) {
    return failure(error);
  }
}

export async function requestPtm(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    let teacherId = text(formData, 'teacher_id');
    let studentId = text(formData, 'student_id');
    const { db, context, user } = await mutationContext('ptm.read', 'ptm-request', 'ptm');
    const role = context.membership.member_role;

    let parentId: string | null = null;
    if (role === 'parent') {
      if (!studentId) throw new Error('Select a student.');
      const { data: relationship } = await db
        .from('school_guardians')
        .select('id')
        .eq('organization_id', context.organization.id)
        .eq('guardian_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle();
      if (!relationship) throw new Error('You can only request a meeting for a linked student.');
      parentId = user.id;
    } else if (role === 'student') {
      studentId = user.id;
    } else if (['owner', 'admin', 'teacher', 'staff'].includes(role)) {
      if (!studentId) throw new Error('Select a student.');
    } else {
      throw new Error('You are not able to request PTM meetings.');
    }

    const slotId = optionalText(formData, 'slot_id');
    let startsAt = optionalText(formData, 'starts_at');
    let endsAt = optionalText(formData, 'ends_at');
    let meetingMode = text(formData, 'meeting_mode') === 'in_person' ? 'in_person' : 'online';
    let campusId: string | null = null;

    if (slotId) {
      const { data: slot } = await db
        .from('school_ptm_slots')
        .select('*')
        .eq('id', slotId)
        .eq('organization_id', context.organization.id)
        .eq('is_open', true)
        .maybeSingle();
      if (!slot) throw new Error('That slot is no longer available.');
      const { count: taken } = await db
        .from('school_ptm_requests')
        .select('id', { count: 'exact', head: true })
        .eq('slot_id', slotId)
        .not('status', 'in', '(cancelled,rescheduled)');
      if ((taken || 0) >= slot.max_participants) throw new Error('That slot is fully booked.');
      startsAt = slot.starts_at;
      endsAt = slot.ends_at;
      meetingMode = slot.meeting_mode;
      campusId = slot.campus_id;
      teacherId = slot.teacher_id;
    }
    if (!teacherId) throw new Error('Select a teacher.');

    const directDetails = Boolean(text(formData, 'join_link') || text(formData, 'location'));
    const isStaffDirect = ['owner', 'admin', 'teacher'].includes(role) && Boolean(startsAt) && directDetails;
    const status = isStaffDirect ? 'scheduled' : 'requested';

    const { data, error } = await db
      .from('school_ptm_requests')
      .insert({
        organization_id: context.organization.id,
        campus_id: campusId,
        slot_id: slotId || null,
        teacher_id: teacherId,
        student_id: studentId,
        parent_id: parentId,
        requested_by: user.id,
        created_by: user.id,
        meeting_mode: meetingMode,
        join_link: optionalText(formData, 'join_link'),
        location: optionalText(formData, 'location'),
        topic: text(formData, 'topic').slice(0, 500) || null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        status,
        responded_by: isStaffDirect ? user.id : null,
        responded_at: isStaffDirect ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'ptm_request', data.id, { status });
    return done('/school-admin/ptm', status === 'scheduled' ? 'PTM meeting scheduled.' : 'PTM meeting requested.');
  } catch (error) {
    return failure(error);
  }
}

const PTM_RESPOND_STATUSES = new Set(['approved', 'scheduled', 'cancelled']);

export async function respondPtmRequest(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !PTM_RESPOND_STATUSES.has(status)) throw new Error('Meeting and a valid decision are required.');
    const { db, context, user } = await mutationContext('ptm.manage', 'ptm-respond', 'ptm');
    const startsAt = optionalText(formData, 'starts_at');
    const endsAt = optionalText(formData, 'ends_at');
    if (status === 'scheduled' && !startsAt) throw new Error('A meeting time is required to schedule.');

    const update: Record<string, unknown> = {
      status,
      teacher_response: optionalText(formData, 'teacher_response'),
      responded_by: user.id,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (status === 'cancelled') update.cancel_reason = optionalText(formData, 'teacher_response');
    if (startsAt) update.starts_at = startsAt;
    if (endsAt) update.ends_at = endsAt;
    const joinLink = optionalText(formData, 'join_link');
    const location = optionalText(formData, 'location');
    if (joinLink) update.join_link = joinLink;
    if (location) update.location = location;

    let query = db
      .from('school_ptm_requests')
      .update(update)
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (context.membership.member_role === 'teacher') query = query.eq('teacher_id', context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    await audit(db, context, 'respond', 'ptm_request', id, { status });
    return done('/school-admin/ptm', 'PTM meeting updated.');
  } catch (error) {
    return failure(error);
  }
}

const PTM_OUTCOME_STATUSES = new Set(['completed', 'missed', 'rescheduled']);

export async function updatePtmOutcome(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !PTM_OUTCOME_STATUSES.has(status)) throw new Error('Meeting and a valid outcome are required.');
    const { db, context } = await mutationContext('ptm.manage', 'ptm-outcome', 'ptm');
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    let query = db
      .from('school_ptm_requests')
      .update(update)
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (context.membership.member_role === 'teacher') query = query.eq('teacher_id', context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    await audit(db, context, 'outcome', 'ptm_request', id, { status });
    return done('/school-admin/ptm', 'PTM meeting outcome recorded.');
  } catch (error) {
    return failure(error);
  }
}

export async function cancelPtmRequest(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const id = text(formData, 'id');
    if (!id) throw new Error('Meeting is required.');
    const { db, context, user } = await mutationContext('ptm.read', 'ptm-cancel', 'ptm');
    const { error } = await db
      .from('school_ptm_requests')
      .update({
        status: 'cancelled',
        cancel_reason: optionalText(formData, 'cancel_reason'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organization.id)
      .or(`requested_by.eq.${user.id},parent_id.eq.${user.id}`);
    if (error) throw new Error(error.message);
    await audit(db, context, 'cancel', 'ptm_request', id);
    return done('/school', 'PTM meeting cancelled.');
  } catch (error) {
    return failure(error);
  }
}

export async function addPtmNote(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const requestId = text(formData, 'request_id');
    const note = text(formData, 'note');
    if (!requestId || !note) throw new Error('A note is required.');
    const { db, context, user } = await mutationContext('ptm.manage', 'ptm-note', 'ptm');
    const { data, error } = await db
      .from('school_ptm_notes')
      .insert({
        organization_id: context.organization.id,
        request_id: requestId,
        author_id: user.id,
        note: note.slice(0, 2000),
        visibility: text(formData, 'visibility') === 'internal' ? 'internal' : 'shared',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'ptm_note', data.id);
    return done('/school-admin/ptm', 'Follow-up note added.');
  } catch (error) {
    return failure(error);
  }
}
