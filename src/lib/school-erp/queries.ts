import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicSchoolOrganization, SchoolContext, SchoolJoinRequestWithRequester } from './types';

// Only these columns are ever selected for the public-facing signup
// autocomplete — mirrors PUBLIC_COLUMNS in src/lib/college/queries.ts.
const PUBLIC_SCHOOL_COLUMNS = 'id, name, slug, organization_type, logo_url';

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
    { count: homeworkDueSoon },
    { count: ptmPending },
    { count: ptmUpcoming },
    announcements,
    events,
  ] = await Promise.all([
    db
      .from('school_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    db
      .from('school_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('member_role', ['teacher', 'staff', 'accountant', 'admissions', 'admin']),
    db
      .from('school_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['submitted', 'under_review', 'waitlisted']),
    db
      .from('school_attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('attendance_date', today)
      .in('status', ['absent', 'late']),
    db
      .from('school_fee_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['overdue', 'partial']),
    db
      .from('school_homework')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('due_at', new Date().toISOString())
      .lte('due_at', new Date(Date.now() + 7 * 86400000).toISOString()),
    db
      .from('school_ptm_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'requested'),
    db
      .from('school_ptm_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['approved', 'scheduled'])
      .gte('starts_at', new Date().toISOString()),
    db
      .from('school_announcements')
      .select('id, title, priority, published_at')
      .eq('organization_id', organizationId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(5),
    db
      .from('school_calendar_events')
      .select('id, title, event_type, starts_at')
      .eq('organization_id', organizationId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(5),
  ]);
  return {
    counts: {
      students: students || 0,
      staff: staff || 0,
      pendingAdmissions: pendingAdmissions || 0,
      absentToday: absentToday || 0,
      overdueInvoices: overdueInvoices || 0,
      homeworkDueSoon: homeworkDueSoon || 0,
      ptmPending: ptmPending || 0,
      ptmUpcoming: ptmUpcoming || 0,
    },
    announcements: announcements.data || [],
    events: events.data || [],
  };
}

export type AbsenceAlertRow = {
  id: string;
  status: 'absent' | 'late';
  studentId: string;
  studentName: string;
  className: string;
  guardianPhone: string | null;
  guardianName: string | null;
};

// Powers the principal-dashboard absence alert widget (CLAUDE_CODE_MASTER_PROMPT.md Part 4.1):
// today's absent/late students with their primary alert-receiving guardian's phone number, so the
// UI can offer a one-tap "WhatsApp or Call?" prompt per row.
export async function getTodayAbsences(supabase: SupabaseClient, context: SchoolContext): Promise<AbsenceAlertRow[]> {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const today = new Date().toISOString().slice(0, 10);

  const records = await rows(
    db
      .from('school_attendance_records')
      .select(
        'id, status, student_id, profiles!school_attendance_records_student_id_fkey(id, full_name), school_sections(name, school_classes(name))'
      )
      .eq('organization_id', organizationId)
      .eq('attendance_date', today)
      .in('status', ['absent', 'late'])
      .order('marked_at', { ascending: false })
      .limit(100)
  );
  if (!records.length) return [];

  const studentIds = Array.from(new Set(records.map((row: any) => row.student_id)));
  const guardianLinks = await rows(
    db
      .from('school_guardians')
      .select('student_id, is_primary, receives_alerts, guardian:profiles!school_guardians_guardian_id_fkey(full_name, phone)')
      .eq('organization_id', organizationId)
      .eq('receives_alerts', true)
      .in('student_id', studentIds)
  );
  const guardianByStudent = new Map<string, { full_name: string | null; phone: string | null }>();
  for (const link of guardianLinks) {
    const existing = guardianByStudent.get(link.student_id);
    if (!existing || link.is_primary) {
      const guardian = Array.isArray(link.guardian) ? link.guardian[0] : link.guardian;
      guardianByStudent.set(link.student_id, guardian || null);
    }
  }

  return records.map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const section = Array.isArray(row.school_sections) ? row.school_sections[0] : row.school_sections;
    const klass = section ? (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes) : null;
    const guardian = guardianByStudent.get(row.student_id);
    return {
      id: row.id,
      status: row.status,
      studentId: row.student_id,
      studentName: profile?.full_name || 'Student',
      className: [klass?.name, section?.name].filter(Boolean).join(' - '),
      guardianPhone: guardian?.phone || null,
      guardianName: guardian?.full_name || null,
    };
  });
}

export async function getSchoolPtm(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const role = context.membership.member_role;
  const isTeacher = role === 'teacher';

  let requestsQuery = db
    .from('school_ptm_requests')
    .select(
      '*, teacher:profiles!school_ptm_requests_teacher_id_fkey(id, full_name), student:profiles!school_ptm_requests_student_id_fkey(id, full_name), parent:profiles!school_ptm_requests_parent_id_fkey(id, full_name)'
    )
    .eq('organization_id', organizationId)
    .order('starts_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300);
  if (isTeacher) requestsQuery = requestsQuery.eq('teacher_id', context.userId);

  let slotsQuery = db
    .from('school_ptm_slots')
    .select('*, teacher:profiles!school_ptm_slots_teacher_id_fkey(id, full_name)')
    .eq('organization_id', organizationId)
    .gte('starts_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(200);
  if (isTeacher) slotsQuery = slotsQuery.eq('teacher_id', context.userId);

  const [requests, slots, teachers, students] = await Promise.all([
    rows(requestsQuery),
    rows(slotsQuery),
    rows(
      db
        .from('school_memberships')
        .select('profile_id, profiles(id, full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('member_role', 'teacher')
    ),
    rows(
      db
        .from('school_enrollments')
        .select(
          'student_id, roll_number, profiles!school_enrollments_student_id_fkey(id, full_name), school_sections(name, school_classes(name))'
        )
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('roll_number')
    ),
  ]);

  return { requests, slots, teachers, students, role };
}

export async function getSchoolPtmNotes(supabase: SupabaseClient, requestId: string) {
  const db = supabase as any;
  return rows(
    db
      .from('school_ptm_notes')
      .select('*, author:profiles!school_ptm_notes_author_id_fkey(full_name)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
  );
}

export async function getSchoolAcademicSetup(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [campuses, years, classes, sections, offerings, profiles] = await Promise.all([
    rows(
      db
        .from('school_campuses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_main', { ascending: false })
        .order('name')
    ),
    rows(
      db
        .from('school_academic_years')
        .select('*')
        .eq('organization_id', organizationId)
        .order('starts_on', { ascending: false })
    ),
    rows(
      db
        .from('school_classes')
        .select('*, school_campuses(name), school_academic_years(name)')
        .eq('organization_id', organizationId)
        .order('display_order')
        .order('name')
    ),
    rows(
      db
        .from('school_sections')
        .select('*, school_classes(name), profiles!school_sections_homeroom_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('name')
    ),
    rows(
      db
        .from('school_subject_offerings')
        .select('*, school_sections(name), profiles!school_subject_offerings_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('subject_name')
    ),
    rows(
      db
        .from('school_memberships')
        .select('profile_id, member_role, profiles(full_name, email)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('member_role', ['teacher', 'admin'])
    ),
  ]);
  return { campuses, years, classes, sections, offerings, profiles };
}

export async function getSchoolPeople(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [memberships, enrollments, guardians, sections, years, planSettings, activeStudents] = await Promise.all([
    rows(
      db
        .from('school_memberships')
        .select('*, profiles(id, full_name, email, phone, avatar_url)')
        .eq('organization_id', organizationId)
        .order('member_role')
        .order('joined_at', { ascending: false })
    ),
    rows(
      db
        .from('school_enrollments')
        .select(
          '*, profiles!school_enrollments_student_id_fkey(id, full_name, email), school_sections(name, school_classes(name))'
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ),
    rows(
      db
        .from('school_guardians')
        .select(
          '*, student:profiles!school_guardians_student_id_fkey(full_name), guardian:profiles!school_guardians_guardian_id_fkey(full_name, email)'
        )
        .eq('organization_id', organizationId)
    ),
    rows(
      db
        .from('school_sections')
        .select('id, name, school_classes(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    rows(
      db
        .from('school_academic_years')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('starts_on', { ascending: false })
    ),
    rows(db.from('school_organization_plan_settings').select('*').eq('organization_id', organizationId).limit(1)),
    db
      .from('school_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
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
      .select(
        '*, school_campuses(name), school_academic_years(name), school_admission_documents(id, document_type, file_name, verification_status)'
      )
      .eq('organization_id', context.organization.id)
      .order('created_at', { ascending: false })
  );
}

export async function getSchoolAttendance(supabase: SupabaseClient, context: SchoolContext, date: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [sections, enrollments, records, leaves, staffMembers, staffRecords] = await Promise.all([
    rows(
      db
        .from('school_sections')
        .select('id, name, school_classes(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    rows(
      db
        .from('school_enrollments')
        .select('id, section_id, student_id, roll_number, profiles!school_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
    rows(
      db.from('school_attendance_records').select('*').eq('organization_id', organizationId).eq('attendance_date', date)
    ),
    rows(
      db
        .from('school_leave_requests')
        .select('*, profiles!school_leave_requests_requester_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    rows(
      db
        .from('school_memberships')
        .select('id, member_role, employee_code, profiles(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('member_role', ['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant'])
        .order('member_role')
    ),
    rows(
      db.from('school_staff_attendance').select('*').eq('organization_id', organizationId).eq('attendance_date', date)
    ),
  ]);
  return { sections, enrollments, records, leaves, staffMembers, staffRecords, date };
}

// Bulk fetch for the report-card template gallery (/school-admin/exams/report-cards/[examId]).
export async function getExamReportCards(supabase: SupabaseClient, context: SchoolContext, examId: string) {
  const db = supabase as any;
  const { data: exam } = await db
    .from('school_exams')
    .select('id, name, term')
    .eq('id', examId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();
  if (!exam) return null;

  const cards = await rows(
    db
      .from('school_report_cards')
      .select('*, profiles!school_report_cards_student_id_fkey(full_name)')
      .eq('organization_id', context.organization.id)
      .eq('exam_id', examId)
      .not('published_at', 'is', null)
      .order('class_position', { ascending: true, nullsFirst: false })
  );
  return { exam, cards };
}

export async function getSchoolExams(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [exams, schedules, marks, sections, years, offerings, enrollments] = await Promise.all([
    rows(
      db.from('school_exams').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })
    ),
    rows(
      db
        .from('school_exam_schedules')
        .select('*, school_exams(name), school_sections(name, school_classes(name))')
        .eq('organization_id', organizationId)
        .order('exam_date')
    ),
    rows(
      db
        .from('school_exam_marks')
        .select('*, profiles!school_exam_marks_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('entered_at', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('school_sections')
        .select('id, name, school_classes(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    rows(
      db
        .from('school_academic_years')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('starts_on', { ascending: false })
    ),
    rows(
      db
        .from('school_subject_offerings')
        .select('id, section_id, subject_name')
        .eq('organization_id', organizationId)
        .order('subject_name')
    ),
    rows(
      db
        .from('school_enrollments')
        .select('section_id, student_id, roll_number, profiles!school_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
  ]);
  return { exams, schedules, marks, sections, years, offerings, enrollments };
}

export async function getSchoolFees(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [structures, invoices, payments, years, classes, students] = await Promise.all([
    rows(
      db
        .from('school_fee_structures')
        .select('*, school_classes(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ),
    rows(
      db
        .from('school_fee_invoices')
        .select('*, profiles!school_fee_invoices_student_id_fkey(full_name), school_fee_structures(name)')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('school_fee_payments')
        .select('*, school_fee_invoices(voucher_number), profiles!school_fee_payments_received_by_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('paid_at', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('school_academic_years')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('starts_on', { ascending: false })
    ),
    rows(db.from('school_classes').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(
      db
        .from('school_enrollments')
        .select('student_id, admission_number, profiles!school_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
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
        .order('member_role')
    ),
    rows(
      db
        .from('school_staff_compensation')
        .select('*, school_memberships(member_role, designation, employee_code, profiles(full_name, email))')
        .eq('organization_id', organizationId)
        .order('effective_from', { ascending: false })
    ),
    rows(
      db
        .from('school_payroll_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('payroll_month', { ascending: false })
        .limit(24)
    ),
    rows(
      db
        .from('school_payroll_items')
        .select(
          '*, school_memberships(member_role, designation, employee_code, profiles(full_name, email)), school_payroll_runs(payroll_month, status)'
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500)
    ),
  ]);
  return { memberships, compensation, runs, items };
}

export async function getSchoolAcademics(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [homework, timetable, lessonPlans, events, sections, offerings] = await Promise.all([
    rows(
      db
        .from('school_homework')
        .select('*, school_sections(name, school_classes(name))')
        .eq('organization_id', organizationId)
        .order('due_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('school_timetable_entries')
        .select(
          '*, school_sections(name, school_classes(name)), profiles!school_timetable_entries_teacher_id_fkey(full_name)'
        )
        .eq('organization_id', organizationId)
        .order('day_of_week')
        .order('starts_at')
    ),
    rows(
      db
        .from('school_lesson_plans')
        .select('*, school_subject_offerings(subject_name)')
        .eq('organization_id', organizationId)
        .order('lesson_date', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('school_calendar_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('starts_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('school_sections')
        .select('id, name, school_classes(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
    rows(
      db
        .from('school_subject_offerings')
        .select('id, section_id, subject_name, teacher_id')
        .eq('organization_id', organizationId)
        .order('subject_name')
    ),
  ]);
  return { homework, timetable, lessonPlans, events, sections, offerings };
}

export async function getSchoolCommunication(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [announcements, deliveries, campuses, messages] = await Promise.all([
    rows(
      db
        .from('school_announcements')
        .select('*, school_campuses(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('school_notification_deliveries')
        .select('channel, status, attempts, last_error, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
    ),
    rows(db.from('school_campuses').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(
      db
        .from('school_contact_messages')
        .select('*, profiles!school_contact_messages_sender_id_fkey(full_name, email)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
    ),
  ]);
  return { announcements, deliveries, campuses, messages };
}

export async function getSchoolReports(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [attendance, invoices, reportCards, admissions, auditLogs] = await Promise.all([
    rows(
      db
        .from('school_attendance_records')
        .select('status, attendance_date')
        .eq('organization_id', organizationId)
        .gte('attendance_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
    ),
    rows(
      db
        .from('school_fee_invoices')
        .select('status, total_amount, paid_amount, due_date')
        .eq('organization_id', organizationId)
    ),
    rows(
      db
        .from('school_report_cards')
        .select('percentage, grade, gpa, published_at')
        .eq('organization_id', organizationId)
        .not('published_at', 'is', null)
    ),
    rows(db.from('school_admissions').select('status, created_at').eq('organization_id', organizationId)),
    rows(
      db
        .from('school_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100)
    ),
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
      db
        .from('school_guardians')
        .select('student_id')
        .eq('organization_id', organizationId)
        .eq('guardian_id', context.userId)
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
          .eq('status', 'active')
      )
    : [];
  const sectionIds = Array.from(new Set(enrollmentRows.map((item: any) => item.section_id)));

  const leaveRequesterIds = studentIds.length ? studentIds : [context.userId];
  let ptmQuery = db
    .from('school_ptm_requests')
    .select(
      '*, teacher:profiles!school_ptm_requests_teacher_id_fkey(id, full_name), student:profiles!school_ptm_requests_student_id_fkey(id, full_name)'
    )
    .eq('organization_id', organizationId)
    .order('starts_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (role === 'teacher') ptmQuery = ptmQuery.eq('teacher_id', context.userId);
  else if (role === 'parent') ptmQuery = ptmQuery.eq('parent_id', context.userId);
  else if (role === 'student') ptmQuery = ptmQuery.eq('student_id', context.userId);
  else ptmQuery = ptmQuery.or(`requested_by.eq.${context.userId},teacher_id.eq.${context.userId}`);

  const availableSlots = ['student', 'parent'].includes(role)
    ? rows(
        db
          .from('school_ptm_slots')
          .select('*, teacher:profiles!school_ptm_slots_teacher_id_fkey(id, full_name)')
          .eq('organization_id', organizationId)
          .eq('is_open', true)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(50)
      )
    : Promise.resolve([]);
  const ptmTeachers = ['student', 'parent'].includes(role)
    ? rows(
        db
          .from('school_memberships')
          .select('profile_id, profiles(id, full_name)')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .eq('member_role', 'teacher')
      )
    : Promise.resolve([]);

  const [
    announcements,
    events,
    timetable,
    homework,
    attendance,
    reportCards,
    invoices,
    students,
    leaves,
    messages,
    ptmRequests,
    ptmSlots,
    ptmTeacherOptions,
  ] = await Promise.all([
    rows(
      db
        .from('school_announcements')
        .select('id, title, body, priority, published_at')
        .eq('organization_id', organizationId)
        .contains('audience_roles', [role])
        .not('published_at', 'is', null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('published_at', { ascending: false })
        .limit(20)
    ),
    rows(
      db
        .from('school_calendar_events')
        .select('id, title, event_type, starts_at, ends_at')
        .eq('organization_id', organizationId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(20)
    ),
    sectionIds.length
      ? rows(
          db
            .from('school_timetable_entries')
            .select('*, school_sections(name, school_classes(name))')
            .eq('organization_id', organizationId)
            .in('section_id', sectionIds)
            .order('day_of_week')
            .order('starts_at')
        )
      : Promise.resolve([]),
    sectionIds.length
      ? rows(
          db
            .from('school_homework')
            .select('*, school_sections(name, school_classes(name))')
            .eq('organization_id', organizationId)
            .in('section_id', sectionIds)
            .order('due_at', { ascending: false })
            .limit(50)
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('school_attendance_records')
            .select('*, profiles!school_attendance_records_student_id_fkey(full_name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .order('attendance_date', { ascending: false })
            .limit(120)
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('school_report_cards')
            .select('*, school_exams(name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .not('published_at', 'is', null)
            .order('published_at', { ascending: false })
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('school_fee_invoices')
            .select('*, profiles!school_fee_invoices_student_id_fkey(full_name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .order('due_date', { ascending: false })
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(db.from('profiles').select('id, full_name, avatar_url').in('id', studentIds))
      : Promise.resolve([]),
    rows(
      db
        .from('school_leave_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .in('requester_id', leaveRequesterIds)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
    rows(
      db
        .from('school_contact_messages')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sender_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
    rows(ptmQuery),
    availableSlots,
    ptmTeachers,
  ]);
  return {
    announcements,
    events,
    timetable,
    homework,
    attendance,
    reportCards,
    invoices,
    students,
    leaves,
    messages,
    ptmRequests,
    ptmSlots,
    ptmTeacherOptions,
  };
}

// =========================================
// Institutional signup: school directory search + join requests
// Mirrors getActiveColleges / getPendingJoinRequests in src/lib/college/queries.ts
// =========================================

export async function getActiveSchools(supabase: SupabaseClient, search?: string): Promise<PublicSchoolOrganization[]> {
  const db = supabase as any;
  let query = db
    .from('school_organizations')
    .select(PUBLIC_SCHOOL_COLUMNS)
    .in('status', ['trial', 'active'])
    .order('name');

  if (search && search.trim()) {
    const term = search.trim().replace(/[%_]/g, '');
    query = query.ilike('name', `%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as PublicSchoolOrganization[] | null) ?? [];
}

export async function getPendingSchoolJoinRequests(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SchoolJoinRequestWithRequester[]> {
  const db = supabase as any;
  // `requester:profiles!school_join_requests_requester_id_fkey` disambiguates
  // the embed — school_join_requests has two FKs into profiles
  // (requester_id and resolved_by), so PostgREST needs the constraint name.
  const { data, error } = await db
    .from('school_join_requests')
    .select(
      'id, requester_id, organization_id, role_requested, status, requested_at, resolved_at, resolved_by, requester:profiles!school_join_requests_requester_id_fkey ( id, full_name, email, avatar_url )'
    )
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SchoolJoinRequestWithRequester[];
}

export type PendingStudentAddition = {
  id: string;
  section_id: string;
  extracted_name: string;
  extracted_roll_number: string | null;
  status: string;
  created_at: string;
  section: { name: string; className: string | null } | null;
};

// New-student-detected list for /school-admin/requests — see
// supabase/migrations/20260812096000_school_attendance_scan_pending_students.sql.
export async function getPendingStudentAdditions(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PendingStudentAddition[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('school_pending_student_additions')
    .select('id, section_id, extracted_name, extracted_roll_number, status, created_at, school_sections(name, school_classes(name))')
    .eq('organization_id', organizationId)
    .eq('status', 'pending_principal_approval')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const section = Array.isArray(row.school_sections) ? row.school_sections[0] : row.school_sections;
    const klass = section ? (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes) : null;
    return {
      id: row.id,
      section_id: row.section_id,
      extracted_name: row.extracted_name,
      extracted_roll_number: row.extracted_roll_number,
      status: row.status,
      created_at: row.created_at,
      section: section ? { name: section.name, className: klass?.name || null } : null,
    };
  });
}
