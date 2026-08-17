'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { getActiveCollegeOrganizationId, getCollegeContext, hasCollegeModule, hasCollegePermission } from './access';
import type { CollegeModuleKey } from './modules';
import { grantCollegeSubscription, isCollegeOrganizationBillingActive } from './subscription-cascade';
import { uploadCollegeLogo } from './storage';
import type { CollegeActionState, CollegeContext, CollegePermission } from './types';
import { inviteOrFindProfileId } from '@/lib/auth/inviteOrFindProfile';
import { mapInstitutionRoleToProfileRole } from '@/lib/auth/mapInstitutionRoleToProfileRole';

// College-side mirror of src/lib/school-erp/actions.ts. Payroll and PTM (parent-teacher meeting)
// actions are NOT ported — those operate on school-only tables from later migrations
// (20260806.../20260807...) that were never mirrored for college. See
// docs/SCHOOL_COLLEGE_SEPARATION_TODO.md for the tracked follow-up. Everything else is ported.

const SUCCESS: CollegeActionState = { success: true, message: 'Saved successfully.' };

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

async function mutationContext(permission: CollegePermission, action: string, module?: CollegeModuleKey) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const organizationId = await getActiveCollegeOrganizationId();
  const context =
    (organizationId ? await getCollegeContext(supabase, user.id, organizationId) : null) ||
    (await getCollegeContext(supabase, user.id));
  if (!context || !hasCollegePermission(context, permission))
    throw new Error('You do not have permission for this action.');
  if (module && !hasCollegeModule(context, module))
    throw new Error('This module is not included in your institution plan.');

  const limit = await checkDailyLimit(user.id, `erp_mutation:${action}`, 500);
  if (!limit.success)
    throw new Error('Too many college updates today. Try again after the daily security window resets.');
  return { supabase, user, context, db: supabase as any };
}

async function audit(
  db: any,
  context: CollegeContext,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {}
) {
  await db.from('college_audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: context.userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata,
  });
}

function done(path: string, message: string): CollegeActionState {
  revalidatePath('/college-admin', 'layout');
  revalidatePath(path);
  revalidatePath('/college');
  return { success: true, message };
}

function failure(error: unknown): CollegeActionState {
  return { success: false, message: error instanceof Error ? error.message : 'The update could not be completed.' };
}

async function assertStudentLimit(db: any, organizationId: string) {
  const [{ data: plan }, { count }] = await Promise.all([
    db.from('college_organization_plan_settings').select('max_students').eq('organization_id', organizationId).maybeSingle(),
    db.from('college_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
  ]);
  const maxStudents = Number(plan?.max_students || 500);
  if ((count || 0) >= maxStudents) {
    throw new Error(
      `Student limit reached (${count || 0}/${maxStudents}). Ask platform admin to increase this college's plan.`
    );
  }
}

export async function updateCollegeOrganization(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
  try {
    const name = text(formData, 'name');
    const timezone = text(formData, 'timezone') || 'Asia/Karachi';
    const currency = text(formData, 'currency').toUpperCase();
    if (name.length < 2 || name.length > 120) throw new Error('College name must be between 2 and 120 characters.');
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code such as PKR.');
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      throw new Error('Enter a valid IANA timezone such as Asia/Karachi.');
    }
    const { db, context } = await mutationContext('organization.manage', 'organization-profile');
    const { error } = await db.rpc('college_update_organization_profile', {
      p_organization_id: context.organization.id,
      p_name: name,
      p_timezone: timezone,
      p_currency: currency,
      p_email: text(formData, 'email'),
      p_phone: text(formData, 'phone'),
      p_address: text(formData, 'address'),
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'update', 'college_organization', context.organization.id);
    return done('/college-admin/settings', 'Organization profile updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function updateCollegeLogo(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const file = formData.get('logo');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a logo image to upload.');
    if (!file.type.startsWith('image/')) throw new Error('Logo must be an image file.');
    const { db, context } = await mutationContext('organization.manage', 'organization-logo');
    const logoUrl = await uploadCollegeLogo(db, context.organization.id, file);
    const { error } = await db.rpc('college_update_organization_logo', {
      p_organization_id: context.organization.id,
      p_logo_url: logoUrl,
    });
    if (error) throw new Error(error.message);
    await audit(db, context, 'update', 'college_organization_logo', context.organization.id);
    return done('/college-admin/settings', 'Logo updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeCampus(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const parsed = z.object({ name: z.string().min(2).max(100), code: z.string().min(1).max(20) }).parse({
      name: text(formData, 'name'),
      code: text(formData, 'code').toUpperCase(),
    });
    const { db, context } = await mutationContext('organization.manage', 'campus');
    const { data, error } = await db
      .from('college_campuses')
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
    return done('/college-admin/academics', 'Campus added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeDepartment(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const parsed = z.object({ name: z.string().min(2).max(120), code: z.string().min(1).max(20) }).parse({
      name: text(formData, 'name'),
      code: text(formData, 'code').toUpperCase(),
    });
    const { db, context } = await mutationContext('organization.manage', 'department');
    const { data, error } = await db
      .from('college_academic_departments')
      .insert({
        organization_id: context.organization.id,
        campus_id: optionalText(formData, 'campus_id'),
        name: parsed.name,
        code: parsed.code,
        head_of_department_id: optionalText(formData, 'head_of_department_id'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'department', data.id);
    return done('/college-admin/academics', 'Department added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeAcademicYear(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const name = text(formData, 'name');
    const startsOn = dateValue(formData, 'starts_on');
    const endsOn = dateValue(formData, 'ends_on');
    if (!name || !startsOn || !endsOn) throw new Error('Academic year name and dates are required.');
    const { db, context } = await mutationContext('organization.manage', 'academic-year');
    if (formData.get('is_current') === 'on') {
      await db.from('college_academic_years').update({ is_current: false }).eq('organization_id', context.organization.id);
    }
    const { data, error } = await db
      .from('college_academic_years')
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
    return done('/college-admin/academics', 'Academic year added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeSemester(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const name = text(formData, 'name');
    const campusId = text(formData, 'campus_id');
    const departmentId = text(formData, 'department_id');
    const academicYearId = text(formData, 'academic_year_id');
    if (!name || !campusId || !departmentId || !academicYearId) {
      throw new Error('Semester name, campus, department, and academic year are required.');
    }
    const { db, context } = await mutationContext('organization.manage', 'semester');
    const { data, error } = await db
      .from('college_semesters')
      .insert({
        organization_id: context.organization.id,
        campus_id: campusId,
        department_id: departmentId,
        academic_year_id: academicYearId,
        name,
        semester_number: numberValue(formData, 'semester_number') || null,
        display_order: numberValue(formData, 'display_order'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'semester', data.id);
    return done('/college-admin/academics', 'Semester added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeSection(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const semesterId = text(formData, 'semester_id');
    const name = text(formData, 'name');
    if (!semesterId || !name) throw new Error('Semester and section name are required.');
    const { db, context } = await mutationContext('organization.manage', 'section');
    const { data, error } = await db
      .from('college_sections')
      .insert({
        organization_id: context.organization.id,
        semester_id: semesterId,
        name,
        room: optionalText(formData, 'room'),
        capacity: Math.max(1, numberValue(formData, 'capacity', 60)),
        advisor_id: optionalText(formData, 'advisor_id'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'section', data.id);
    return done('/college-admin/academics', 'Section added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCourseOffering(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const courseName = text(formData, 'course_name');
    if (!sectionId || !courseName) throw new Error('Section and course are required.');
    const { db, context } = await mutationContext('academics.manage', 'course-offering');
    const { data, error } = await db
      .from('college_course_offerings')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        course_id: optionalText(formData, 'course_id'),
        course_code: optionalText(formData, 'course_code'),
        course_name: courseName,
        teacher_id: optionalText(formData, 'teacher_id'),
        credit_hours: Math.max(0.5, numberValue(formData, 'credit_hours', 3)),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'course_offering', data.id);
    return done('/college-admin/academics', 'Course offering added.');
  } catch (error) {
    return failure(error);
  }
}

export async function addCollegeMember(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
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
      .from('college_memberships')
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
    if (await isCollegeOrganizationBillingActive(db, context.organization.id)) {
      await grantCollegeSubscription(context.organization.id, profile.id);
    }
    return done(
      '/college-admin/people',
      profile.invited ? 'College member added. An invite email was sent to set their password.' : 'College member added.'
    );
  } catch (error) {
    return failure(error);
  }
}

export async function enrollCollegeStudent(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const studentEmail = text(formData, 'student_email').toLowerCase();
    const sectionId = text(formData, 'section_id');
    const academicYearId = text(formData, 'academic_year_id');
    const registrationNumber = text(formData, 'registration_number');
    if (!studentEmail || !sectionId || !academicYearId || !registrationNumber) {
      throw new Error('Student email, section, academic year, and registration number are required.');
    }
    const { db, context } = await mutationContext('admissions.manage', 'enrollment', 'people');
    const { data: profile } = await db.from('profiles').select('id').eq('email', studentEmail).maybeSingle();
    if (!profile) throw new Error('The student must register an ilm AI account first.');
    const { data: existingActive } = await db
      .from('college_enrollments')
      .select('id')
      .eq('organization_id', context.organization.id)
      .eq('student_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!existingActive) await assertStudentLimit(db, context.organization.id);
    await db.from('college_memberships').upsert(
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
      .from('college_enrollments')
      .upsert(
        {
          organization_id: context.organization.id,
          academic_year_id: academicYearId,
          section_id: sectionId,
          student_id: profile.id,
          registration_number: registrationNumber,
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
    if (await isCollegeOrganizationBillingActive(db, context.organization.id)) {
      await grantCollegeSubscription(context.organization.id, profile.id);
    }
    return done('/college-admin/people', 'Student enrolled.');
  } catch (error) {
    return failure(error);
  }
}

export async function linkCollegeGuardian(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const studentId = text(formData, 'student_id');
    const guardianEmail = text(formData, 'guardian_email').toLowerCase();
    if (!studentId || !z.string().email().safeParse(guardianEmail).success)
      throw new Error('Student and guardian email are required.');
    const { db, context } = await mutationContext('people.manage', 'guardian', 'people');
    const { data: profile } = await db.from('profiles').select('id').eq('email', guardianEmail).maybeSingle();
    if (!profile) throw new Error('The guardian must register an ilm AI account first.');
    await db.from('college_memberships').upsert(
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
      .from('college_guardians')
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
    return done('/college-admin/people', 'Guardian linked.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeAdmission(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const applicantName = text(formData, 'applicant_name');
    const applyingForProgram = text(formData, 'applying_for_program');
    const guardianName = text(formData, 'guardian_name');
    const guardianPhone = text(formData, 'guardian_phone');
    if (!applicantName || !applyingForProgram || !guardianName || !guardianPhone) {
      throw new Error('Applicant, program, guardian, and phone are required.');
    }
    const { db, context } = await mutationContext('admissions.manage', 'admission', 'admissions');
    const applicationNumber = text(formData, 'application_number') || `APP-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await db
      .from('college_admissions')
      .insert({
        organization_id: context.organization.id,
        campus_id: optionalText(formData, 'campus_id'),
        academic_year_id: optionalText(formData, 'academic_year_id'),
        application_number: applicationNumber,
        applicant_name: applicantName,
        date_of_birth: dateValue(formData, 'date_of_birth') || null,
        gender: optionalText(formData, 'gender'),
        applying_for_program: applyingForProgram,
        guardian_name: guardianName,
        guardian_email: optionalText(formData, 'guardian_email'),
        guardian_phone: guardianPhone,
        previous_institution: optionalText(formData, 'previous_institution'),
        notes: optionalText(formData, 'notes'),
        status: 'submitted',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'admission', data.id, { applicationNumber });
    return done('/college-admin/admissions', `Application ${applicationNumber} created.`);
  } catch (error) {
    return failure(error);
  }
}

export async function updateCollegeAdmissionStatus(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    const statuses = ['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'];
    if (!id || !statuses.includes(status)) throw new Error('Application and valid status are required.');
    const { db, context, user } = await mutationContext('admissions.manage', 'admission-status', 'admissions');
    const { error } = await db
      .from('college_admissions')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'status_change', 'admission', id, { status });
    return done('/college-admin/admissions', 'Admission status updated.');
  } catch (error) {
    return failure(error);
  }
}

type AttendanceInput = { studentId: string; status: string; remarks?: string };

export async function saveCollegeAttendance(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
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
    const { error } = await db.from('college_attendance_records').upsert(records, { onConflict: 'section_id,student_id,attendance_date' });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'attendance', sectionId, { attendanceDate, count: records.length });
    return done('/college-admin/attendance', `${records.length} attendance records saved.`);
  } catch (error) {
    return failure(error);
  }
}

export async function requestNewCollegeStudentAddition(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const extractedName = text(formData, 'extracted_name');
    const extractedRollNumber = optionalText(formData, 'extracted_roll_number');
    if (!sectionId || !extractedName) throw new Error('Section and student name are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'pending-student-addition', 'attendance');
    const { error } = await db.from('college_pending_student_additions').upsert(
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
    return done('/college-admin/requests', `Reported "${extractedName}" to the principal for approval.`);
  } catch (error) {
    return failure(error);
  }
}

export async function reviewPendingCollegeStudentAddition(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !['approved', 'rejected'].includes(status)) throw new Error('Request and decision are required.');
    const { db, context, user } = await mutationContext('people.manage', 'pending-student-review', 'people');
    const { error } = await db
      .from('college_pending_student_additions')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'review', 'pending_student_addition', id, { status });
    return done(
      '/college-admin/requests',
      status === 'approved'
        ? 'Approved — enroll this student from People once their account/guardian details are collected.'
        : 'Rejected.'
    );
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeLeaveRequest(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
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
        .from('college_guardians')
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
      .from('college_leave_requests')
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
    return done('/college', 'Leave request submitted.');
  } catch (error) {
    return failure(error);
  }
}

export async function reviewCollegeLeaveRequest(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const id = text(formData, 'id');
    const status = text(formData, 'status');
    if (!id || !['approved', 'rejected'].includes(status)) throw new Error('Leave request and decision are required.');
    const { db, context, user } = await mutationContext('attendance.manage', 'leave-review', 'attendance');
    const { error } = await db
      .from('college_leave_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'review', 'leave_request', id, { status });
    return done('/college-admin/attendance', 'Leave request updated.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeExam(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const name = text(formData, 'name');
    const academicYearId = text(formData, 'academic_year_id');
    const startsOn = dateValue(formData, 'starts_on');
    const endsOn = dateValue(formData, 'ends_on');
    if (!name || !academicYearId || !startsOn || !endsOn) throw new Error('Exam name, year, and dates are required.');
    const { db, context, user } = await mutationContext('exams.manage', 'exam', 'exams');
    const { data, error } = await db
      .from('college_exams')
      .insert({
        organization_id: context.organization.id,
        academic_year_id: academicYearId,
        name,
        term: optionalText(formData, 'term'),
        starts_on: startsOn,
        ends_on: endsOn,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'exam', data.id);
    return done('/college-admin/exams', 'Exam created.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeExamSchedule(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const examId = text(formData, 'exam_id');
    const sectionId = text(formData, 'section_id');
    const courseName = text(formData, 'course_name');
    const examDate = dateValue(formData, 'exam_date');
    if (!examId || !sectionId || !courseName || !examDate)
      throw new Error('Exam, section, course, and date are required.');
    const { db, context } = await mutationContext('exams.manage', 'exam-schedule', 'exams');
    const { data, error } = await db
      .from('college_exam_schedules')
      .insert({
        organization_id: context.organization.id,
        exam_id: examId,
        section_id: sectionId,
        course_offering_id: optionalText(formData, 'course_offering_id'),
        course_name: courseName,
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
    return done('/college-admin/exams', 'Date-sheet entry added.');
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

export async function createCollegeExamScheduleBatch(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
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
        course_name: entry.subjectName.slice(0, 200),
        exam_date: entry.examDate,
        starts_at: entry.startsAt || null,
        ends_at: entry.endsAt || null,
        room: entry.room?.slice(0, 100) || null,
        max_marks: Math.max(1, Number(entry.maxMarks) || 100),
        passing_marks: Math.max(0, Number(entry.passingMarks) || 40),
      }));
    if (!records.length) throw new Error('No valid exam slots were provided.');

    const { error } = await db.from('college_exam_schedules').upsert(records, { onConflict: 'exam_id,section_id,course_name' });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'exam_schedule', examId, { count: records.length });
    return done('/college-admin/exams', `Date sheet saved — ${records.length} exam slot${records.length === 1 ? '' : 's'}.`);
  } catch (error) {
    return failure(error);
  }
}

type MarkInput = { studentId: string; marks: number | null; absent?: boolean; remarks?: string };

export async function saveCollegeExamMarks(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const scheduleId = text(formData, 'schedule_id');
    const entries = JSON.parse(text(formData, 'entries') || '[]') as MarkInput[];
    if (!scheduleId || !entries.length) throw new Error('Exam schedule and marks are required.');
    const { db, context, user } = await mutationContext('exams.manage', 'exam-marks', 'exams');
    const { data: schedule } = await db.from('college_exam_schedules').select('max_marks').eq('id', scheduleId).maybeSingle();
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
    const { error } = await db.from('college_exam_marks').upsert(records, { onConflict: 'schedule_id,student_id' });
    if (error) throw new Error(error.message);
    await audit(db, context, 'bulk_upsert', 'exam_marks', scheduleId, { count: records.length });
    return done('/college-admin/exams', `${records.length} marks saved.`);
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

export async function publishCollegeExamResults(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const examId = text(formData, 'exam_id');
    if (!examId) throw new Error('Exam is required.');
    const { db, context } = await mutationContext('exams.manage', 'publish-results', 'exams');
    const { data: schedules } = await db
      .from('college_exam_schedules')
      .select('id, max_marks, course_name')
      .eq('exam_id', examId)
      .eq('organization_id', context.organization.id);
    if (!schedules?.length) throw new Error('Add date-sheet subjects before publishing results.');
    const scheduleIds = schedules.map((item: any) => item.id);
    const { data: marks } = await db
      .from('college_exam_marks')
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
        subject: schedule.course_name,
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
    const { error } = await db.from('college_report_cards').upsert(reportCards, { onConflict: 'exam_id,student_id' });
    if (error) throw new Error(error.message);
    await db.from('college_exams').update({ status: 'published', published_at: publishedAt }).eq('id', examId);
    await audit(db, context, 'publish', 'exam_results', examId, { students: reportCards.length });
    return done('/college-admin/exams', `${reportCards.length} report cards published.`);
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeFeeStructure(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const name = text(formData, 'name');
    const academicYearId = text(formData, 'academic_year_id');
    const amount = numberValue(formData, 'amount', -1);
    if (!name || !academicYearId || amount < 0) throw new Error('Name, academic year, and valid amount are required.');
    const { db, context } = await mutationContext('fees.manage', 'fee-structure', 'fees');
    const { data, error } = await db
      .from('college_fee_structures')
      .insert({
        organization_id: context.organization.id,
        academic_year_id: academicYearId,
        semester_id: optionalText(formData, 'semester_id'),
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
    return done('/college-admin/fees', 'Fee structure added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeFeeInvoice(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
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
      .from('college_fee_invoices')
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
    return done('/college-admin/fees', `Voucher ${voucherNumber} issued.`);
  } catch (error) {
    return failure(error);
  }
}

export async function recordCollegeFeePayment(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const invoiceId = text(formData, 'invoice_id');
    const amount = numberValue(formData, 'amount', -1);
    if (!invoiceId || amount <= 0) throw new Error('Invoice and payment amount are required.');
    const { db, context, user } = await mutationContext('fees.manage', 'fee-payment', 'fees');
    const receiptNumber = text(formData, 'receipt_number') || `R-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await db
      .from('college_fee_payments')
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
    return done('/college-admin/fees', `Payment recorded as ${receiptNumber}.`);
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeAssignment(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const title = text(formData, 'title');
    if (!sectionId || !title) throw new Error('Section and title are required.');
    const { db, context, user } = await mutationContext('academics.manage', 'assignment', 'academics');
    const { data, error } = await db
      .from('college_assignments')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        course_offering_id: optionalText(formData, 'course_offering_id'),
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
    await audit(db, context, 'create', 'assignment', data.id);
    return done('/college-admin/academics', 'Assignment created.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeLessonPlan(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const courseOfferingId = text(formData, 'course_offering_id');
    const title = text(formData, 'title');
    const lessonDate = dateValue(formData, 'lesson_date');
    const status = text(formData, 'status') || 'draft';
    if (!courseOfferingId || !title || !lessonDate) {
      throw new Error('Course, lesson title, and date are required.');
    }
    if (!['draft', 'ready', 'delivered', 'reviewed'].includes(status)) throw new Error('Invalid lesson status.');
    const { db, context, user } = await mutationContext('academics.manage', 'lesson-plan', 'academics');
    const resources = text(formData, 'resources').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20);
    const { data, error } = await db
      .from('college_lesson_plans')
      .insert({
        organization_id: context.organization.id,
        course_offering_id: courseOfferingId,
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
    return done('/college-admin/academics', 'Lesson plan added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeTimetableSlot(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const sectionId = text(formData, 'section_id');
    const courseName = text(formData, 'course_name');
    const startsAt = text(formData, 'starts_at');
    const endsAt = text(formData, 'ends_at');
    if (!sectionId || !courseName || !startsAt || !endsAt)
      throw new Error('Section, course, and times are required.');
    const { db, context } = await mutationContext('academics.manage', 'timetable', 'academics');
    const { data, error } = await db
      .from('college_timetable_slots')
      .insert({
        organization_id: context.organization.id,
        section_id: sectionId,
        course_offering_id: optionalText(formData, 'course_offering_id'),
        course_name: courseName,
        teacher_id: optionalText(formData, 'teacher_id'),
        day_of_week: Math.min(7, Math.max(1, numberValue(formData, 'day_of_week', 1))),
        starts_at: startsAt,
        ends_at: endsAt,
        room: optionalText(formData, 'room'),
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await audit(db, context, 'create', 'timetable_slot', data.id);
    return done('/college-admin/academics', 'Timetable entry added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeCalendarEvent(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const title = text(formData, 'title');
    const startsAt = text(formData, 'starts_at');
    if (!title || !startsAt) throw new Error('Event title and start time are required.');
    const { db, context, user } = await mutationContext('academics.manage', 'calendar-event', 'academics');
    const { data, error } = await db
      .from('college_calendar_events')
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
    return done('/college-admin/academics', 'Calendar event added.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeAnnouncement(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const title = text(formData, 'title');
    const body = text(formData, 'body');
    if (!title || !body) throw new Error('Announcement title and message are required.');
    const roles = formData.getAll('audience_roles').map(String);
    const channels = formData.getAll('delivery_channels').map(String);
    const { db, context, user } = await mutationContext('communication.manage', 'announcement', 'communication');
    const publishedAt = formData.get('publish_now') === 'on' ? new Date().toISOString() : null;
    const { data, error } = await db
      .from('college_announcements')
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
        .from('college_memberships')
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
              channel === 'email' ? profile?.email || null : channel === 'sms' || channel === 'whatsapp' ? profile?.phone || null : null,
            channel,
            status: 'queued',
          };
        })
      );
      if (deliveries.length) await db.from('college_notification_deliveries').insert(deliveries);
    }
    await audit(db, context, 'create', 'announcement', data.id, { published: Boolean(publishedAt) });
    return done('/college-admin/communication', publishedAt ? 'Announcement published and delivery queued.' : 'Announcement saved as draft.');
  } catch (error) {
    return failure(error);
  }
}

export async function publishCollegeAnnouncement(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const id = text(formData, 'id');
    if (!id) throw new Error('Announcement is required.');
    const { db, context } = await mutationContext('communication.manage', 'announcement-publish', 'communication');
    const { data: announcement, error } = await db
      .from('college_announcements')
      .select('id, audience_roles, delivery_channels, published_at')
      .eq('id', id)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
    if (error || !announcement) throw new Error(error?.message || 'Announcement not found.');
    if (announcement.published_at) return done('/college-admin/communication', 'Announcement is already published.');
    const publishedAt = new Date().toISOString();
    const { error: publishError } = await db
      .from('college_announcements')
      .update({ published_at: publishedAt })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (publishError) throw new Error(publishError.message);

    const { data: recipients } = await db
      .from('college_memberships')
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
        recipient_address: channel === 'email' ? profile?.email || null : channel === 'sms' || channel === 'whatsapp' ? profile?.phone || null : null,
        channel,
        status: 'queued',
      }));
    });
    if (deliveries.length) {
      const { error: deliveryError } = await db.from('college_notification_deliveries').insert(deliveries);
      if (deliveryError) throw new Error(deliveryError.message);
    }
    await audit(db, context, 'publish', 'announcement', id, { deliveries: deliveries.length });
    return done('/college-admin/communication', 'Announcement published and delivery queued.');
  } catch (error) {
    return failure(error);
  }
}

export async function createCollegeContactMessage(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
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
      .from('college_contact_messages')
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
    return done('/college', 'Message sent to the college.');
  } catch (error) {
    return failure(error);
  }
}

export async function respondCollegeContactMessage(
  _state: CollegeActionState,
  formData: FormData
): Promise<CollegeActionState> {
  try {
    const id = text(formData, 'id');
    const response = text(formData, 'response');
    const status = text(formData, 'status') || 'replied';
    if (!id || !response) throw new Error('Message and response are required.');
    if (!['replied', 'closed'].includes(status)) throw new Error('Invalid response status.');
    const { db, context, user } = await mutationContext('communication.read', 'contact-response', 'communication');
    const { error } = await db
      .from('college_contact_messages')
      .update({ response: response.slice(0, 3000), status, responded_by: user.id, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
    if (error) throw new Error(error.message);
    await audit(db, context, 'respond', 'contact_message', id, { status });
    return done('/college-admin/communication', 'Response saved.');
  } catch (error) {
    return failure(error);
  }
}
