import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolContext } from './types';

async function rows(query: PromiseLike<{ data: any[] | null; error: { message: string } | null }>): Promise<any[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSchoolOverview(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const today = new Date().toISOString().slice(0, 10);
  const [
    { count: students },
    { count: staff },
    { count: pendingAdmissions },
    { count: absentToday },
    { count: overdueInvoices },
    announcements,
    events,
  ] = await Promise.all([
    db.from('school_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    db.from('school_memberships').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active').in('member_role', ['teacher', 'staff', 'accountant', 'admissions', 'admin']),
    db.from('school_admissions').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['submitted', 'under_review', 'waitlisted']),
    db.from('school_attendance_records').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('attendance_date', today).in('status', ['absent', 'late']),
    db.from('school_fee_invoices').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['overdue', 'partial']),
    db.from('school_announcements').select('id, title, priority, published_at').eq('organization_id', organizationId).not('published_at', 'is', null).order('published_at', { ascending: false }).limit(5),
    db.from('school_calendar_events').select('id, title, event_type, starts_at').eq('organization_id', organizationId).gte('starts_at', new Date().toISOString()).order('starts_at').limit(5),
  ]);
  return {
    counts: {
      students: students || 0,
      staff: staff || 0,
      pendingAdmissions: pendingAdmissions || 0,
      absentToday: absentToday || 0,
      overdueInvoices: overdueInvoices || 0,
    },
    announcements: announcements.data || [],
    events: events.data || [],
  };
}

export async function getSchoolAcademicSetup(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [campuses, years, classes, sections, offerings, profiles] = await Promise.all([
    rows(db.from('school_campuses').select('*').eq('organization_id', organizationId).order('is_main', { ascending: false }).order('name')),
    rows(db.from('school_academic_years').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('school_classes').select('*, school_campuses(name), school_academic_years(name)').eq('organization_id', organizationId).order('display_order').order('name')),
    rows(db.from('school_sections').select('*, school_classes(name), profiles!school_sections_homeroom_teacher_id_fkey(full_name)').eq('organization_id', organizationId).order('name')),
    rows(db.from('school_subject_offerings').select('*, school_sections(name), profiles!school_subject_offerings_teacher_id_fkey(full_name)').eq('organization_id', organizationId).order('subject_name')),
    rows(db.from('school_memberships').select('profile_id, member_role, profiles(full_name, email)').eq('organization_id', organizationId).eq('status', 'active').in('member_role', ['teacher', 'admin'])),
  ]);
  return { campuses, years, classes, sections, offerings, profiles };
}

export async function getSchoolPeople(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [memberships, enrollments, guardians, sections, years, planSettings, activeStudents] = await Promise.all([
    rows(db.from('school_memberships').select('*, profiles(id, full_name, email, phone, avatar_url)').eq('organization_id', organizationId).order('member_role').order('joined_at', { ascending: false })),
    rows(db.from('school_enrollments').select('*, profiles!school_enrollments_student_id_fkey(id, full_name, email), school_sections(name, school_classes(name))').eq('organization_id', organizationId).order('created_at', { ascending: false })),
    rows(db.from('school_guardians').select('*, student:profiles!school_guardians_student_id_fkey(full_name), guardian:profiles!school_guardians_guardian_id_fkey(full_name, email)').eq('organization_id', organizationId)),
    rows(db.from('school_sections').select('id, name, school_classes(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('school_organization_plan_settings').select('*').eq('organization_id', organizationId).limit(1)),
    db.from('school_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
  ]);
  return {
    memberships,
    enrollments,
    guardians,
    sections,
    years,
    planSettings: planSettings[0] || null,
    activeStudentCount: activeStudents.count || 0,
  };
}

export async function getSchoolAdmissions(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  return rows(
    db
      .from('school_admissions')
      .select('*, school_campuses(name), school_academic_years(name), school_admission_documents(id, document_type, file_name, verification_status)')
      .eq('organization_id', context.organization.id)
      .order('created_at', { ascending: false }),
  );
}

export async function getSchoolAttendance(supabase: SupabaseClient, context: SchoolContext, date: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [sections, enrollments, records, leaves, staffMembers, staffRecords] = await Promise.all([
    rows(db.from('school_sections').select('id, name, school_classes(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_enrollments').select('id, section_id, student_id, roll_number, profiles!school_enrollments_student_id_fkey(full_name)').eq('organization_id', organizationId).eq('status', 'active')),
    rows(db.from('school_attendance_records').select('*').eq('organization_id', organizationId).eq('attendance_date', date)),
    rows(db.from('school_leave_requests').select('*, profiles!school_leave_requests_requester_id_fkey(full_name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50)),
    rows(db.from('school_memberships').select('id, member_role, employee_code, profiles(full_name)').eq('organization_id', organizationId).eq('status', 'active').in('member_role', ['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant']).order('member_role')),
    rows(db.from('school_staff_attendance').select('*').eq('organization_id', organizationId).eq('attendance_date', date)),
  ]);
  return { sections, enrollments, records, leaves, staffMembers, staffRecords, date };
}

export async function getSchoolExams(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [exams, schedules, marks, sections, years, offerings, enrollments] = await Promise.all([
    rows(db.from('school_exams').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('school_exam_schedules').select('*, school_exams(name), school_sections(name, school_classes(name))').eq('organization_id', organizationId).order('exam_date')),
    rows(db.from('school_exam_marks').select('*, profiles!school_exam_marks_student_id_fkey(full_name)').eq('organization_id', organizationId).order('entered_at', { ascending: false }).limit(500)),
    rows(db.from('school_sections').select('id, name, school_classes(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('school_subject_offerings').select('id, section_id, subject_name').eq('organization_id', organizationId).order('subject_name')),
    rows(db.from('school_enrollments').select('section_id, student_id, roll_number, profiles!school_enrollments_student_id_fkey(full_name)').eq('organization_id', organizationId).eq('status', 'active')),
  ]);
  return { exams, schedules, marks, sections, years, offerings, enrollments };
}

export async function getSchoolFees(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [structures, invoices, payments, years, classes, students] = await Promise.all([
    rows(db.from('school_fee_structures').select('*, school_classes(name)').eq('organization_id', organizationId).order('created_at', { ascending: false })),
    rows(db.from('school_fee_invoices').select('*, profiles!school_fee_invoices_student_id_fkey(full_name), school_fee_structures(name)').eq('organization_id', organizationId).order('due_date', { ascending: false }).limit(500)),
    rows(db.from('school_fee_payments').select('*, school_fee_invoices(voucher_number), profiles!school_fee_payments_received_by_fkey(full_name)').eq('organization_id', organizationId).order('paid_at', { ascending: false }).limit(500)),
    rows(db.from('school_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('school_classes').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_enrollments').select('student_id, admission_number, profiles!school_enrollments_student_id_fkey(full_name)').eq('organization_id', organizationId).eq('status', 'active')),
  ]);
  return { structures, invoices, payments, years, classes, students };
}

export async function getSchoolPayroll(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [memberships, compensation, runs, items] = await Promise.all([
    rows(
      db
        .from('school_memberships')
        .select('id, member_role, employee_code, designation, profiles(full_name, email)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('member_role', ['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant'])
        .order('member_role'),
    ),
    rows(
      db
        .from('school_staff_compensation')
        .select('*, school_memberships(member_role, designation, employee_code, profiles(full_name, email))')
        .eq('organization_id', organizationId)
        .order('effective_from', { ascending: false }),
    ),
    rows(
      db
        .from('school_payroll_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('payroll_month', { ascending: false })
        .limit(24),
    ),
    rows(
      db
        .from('school_payroll_items')
        .select('*, school_memberships(member_role, designation, employee_code, profiles(full_name, email)), school_payroll_runs(payroll_month, status)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500),
    ),
  ]);
  return { memberships, compensation, runs, items };
}

export async function getSchoolAcademics(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [homework, timetable, lessonPlans, events, sections, offerings] = await Promise.all([
    rows(db.from('school_homework').select('*, school_sections(name, school_classes(name))').eq('organization_id', organizationId).order('due_at', { ascending: false }).limit(200)),
    rows(db.from('school_timetable_entries').select('*, school_sections(name, school_classes(name)), profiles!school_timetable_entries_teacher_id_fkey(full_name)').eq('organization_id', organizationId).order('day_of_week').order('starts_at')),
    rows(db.from('school_lesson_plans').select('*, school_subject_offerings(subject_name)').eq('organization_id', organizationId).order('lesson_date', { ascending: false }).limit(200)),
    rows(db.from('school_calendar_events').select('*').eq('organization_id', organizationId).order('starts_at', { ascending: false }).limit(200)),
    rows(db.from('school_sections').select('id, name, school_classes(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_subject_offerings').select('id, section_id, subject_name, teacher_id').eq('organization_id', organizationId).order('subject_name')),
  ]);
  return { homework, timetable, lessonPlans, events, sections, offerings };
}

export async function getSchoolCommunication(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [announcements, deliveries, campuses, messages] = await Promise.all([
    rows(db.from('school_announcements').select('*, school_campuses(name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200)),
    rows(db.from('school_notification_deliveries').select('channel, status, attempts, last_error, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200)),
    rows(db.from('school_campuses').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('school_contact_messages').select('*, profiles!school_contact_messages_sender_id_fkey(full_name, email)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200)),
  ]);
  return { announcements, deliveries, campuses, messages };
}

export async function getSchoolReports(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [attendance, invoices, reportCards, admissions, auditLogs] = await Promise.all([
    rows(db.from('school_attendance_records').select('status, attendance_date').eq('organization_id', organizationId).gte('attendance_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))),
    rows(db.from('school_fee_invoices').select('status, total_amount, paid_amount, due_date').eq('organization_id', organizationId)),
    rows(db.from('school_report_cards').select('percentage, grade, gpa, published_at').eq('organization_id', organizationId).not('published_at', 'is', null)),
    rows(db.from('school_admissions').select('status, created_at').eq('organization_id', organizationId)),
    rows(db.from('school_audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100)),
  ]);
  return { attendance, invoices, reportCards, admissions, auditLogs };
}

export async function getSchoolPortalData(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const role = context.membership.member_role;
  let studentIds: string[] = [];
  if (role === 'student') studentIds = [context.userId];
  if (role === 'parent') {
    const guardians = await rows(
      db.from('school_guardians').select('student_id').eq('organization_id', organizationId).eq('guardian_id', context.userId),
    );
    studentIds = guardians.map((item: any) => item.student_id);
  }
  const enrollmentRows = studentIds.length
    ? await rows(
        db
          .from('school_enrollments')
          .select('section_id, student_id')
          .eq('organization_id', organizationId)
          .in('student_id', studentIds)
          .eq('status', 'active'),
      )
    : [];
  const sectionIds = Array.from(new Set(enrollmentRows.map((item: any) => item.section_id)));

  const leaveRequesterIds = studentIds.length ? studentIds : [context.userId];
  const [announcements, events, timetable, homework, attendance, reportCards, invoices, students, leaves, messages] = await Promise.all([
    rows(db.from('school_announcements').select('id, title, body, priority, published_at').eq('organization_id', organizationId).contains('audience_roles', [role]).not('published_at', 'is', null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('published_at', { ascending: false }).limit(20)),
    rows(db.from('school_calendar_events').select('id, title, event_type, starts_at, ends_at').eq('organization_id', organizationId).gte('starts_at', new Date().toISOString()).order('starts_at').limit(20)),
    sectionIds.length
      ? rows(db.from('school_timetable_entries').select('*, school_sections(name, school_classes(name))').eq('organization_id', organizationId).in('section_id', sectionIds).order('day_of_week').order('starts_at'))
      : Promise.resolve([]),
    sectionIds.length
      ? rows(db.from('school_homework').select('*, school_sections(name, school_classes(name))').eq('organization_id', organizationId).in('section_id', sectionIds).order('due_at', { ascending: false }).limit(50))
      : Promise.resolve([]),
    studentIds.length
      ? rows(db.from('school_attendance_records').select('*, profiles!school_attendance_records_student_id_fkey(full_name)').eq('organization_id', organizationId).in('student_id', studentIds).order('attendance_date', { ascending: false }).limit(120))
      : Promise.resolve([]),
    studentIds.length
      ? rows(db.from('school_report_cards').select('*, school_exams(name)').eq('organization_id', organizationId).in('student_id', studentIds).not('published_at', 'is', null).order('published_at', { ascending: false }))
      : Promise.resolve([]),
    studentIds.length
      ? rows(db.from('school_fee_invoices').select('*, profiles!school_fee_invoices_student_id_fkey(full_name)').eq('organization_id', organizationId).in('student_id', studentIds).order('due_date', { ascending: false }))
      : Promise.resolve([]),
    studentIds.length
      ? rows(db.from('profiles').select('id, full_name, avatar_url').in('id', studentIds))
      : Promise.resolve([]),
    rows(db.from('school_leave_requests').select('*').eq('organization_id', organizationId).in('requester_id', leaveRequesterIds).order('created_at', { ascending: false }).limit(20)),
    rows(db.from('school_contact_messages').select('*').eq('organization_id', organizationId).eq('sender_id', context.userId).order('created_at', { ascending: false }).limit(20)),
  ]);
  return { announcements, events, timetable, homework, attendance, reportCards, invoices, students, leaves, messages };
}
