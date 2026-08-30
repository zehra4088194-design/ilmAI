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
        'id, status, student_id, profiles!school_attendance_records_student_id_fkey(id, full_name), school_sections!school_attendance_records_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))'
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
          'student_id, roll_number, profiles!school_enrollments_student_id_fkey(id, full_name), school_sections!school_enrollments_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))'
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
        .select('*, school_campuses!school_classes_campus_id_fkey(name), school_academic_years!school_classes_academic_year_id_fkey(name)')
        .eq('organization_id', organizationId)
        .order('display_order')
        .order('name')
    ),
    rows(
      db
        .from('school_sections')
        .select('*, school_classes!school_sections_class_id_fkey(name), profiles!school_sections_homeroom_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('name')
    ),
    rows(
      db
        .from('school_subject_offerings')
        .select('*, school_sections!school_subject_offerings_section_id_fkey(name), profiles!school_subject_offerings_teacher_id_fkey(full_name)')
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
          '*, profiles!school_enrollments_student_id_fkey(id, full_name, email), school_sections!school_enrollments_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))'
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
        .select('id, name, school_classes!school_sections_class_id_fkey(name)')
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
        '*, school_campuses!school_admissions_campus_id_fkey(name), school_academic_years!school_admissions_academic_year_id_fkey(name), school_admission_documents!school_admission_documents_admission_id_fkey(id, document_type, file_name, verification_status)'
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
        .select('id, name, school_classes!school_sections_class_id_fkey(name)')
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

  // Phase 7a — WhatsApp quick-link for today's absentees, same guardian-phone lookup pattern as
  // getSchoolFees.
  const absentStudentIds = Array.from(
    new Set(records.filter((r: any) => r.status === 'absent').map((r: any) => r.student_id))
  );
  const absentees: Array<{ studentId: string; fullName: string; guardianPhone: string | null }> = [];
  if (absentStudentIds.length) {
    const [guardianLinks, absentStudentProfiles] = await Promise.all([
      rows(
        db
          .from('school_guardians')
          .select('student_id, is_primary, profiles!school_guardians_guardian_id_fkey(phone)')
          .eq('organization_id', organizationId)
          .in('student_id', absentStudentIds)
          .order('is_primary', { ascending: false })
      ),
      rows(db.from('profiles').select('id, full_name').in('id', absentStudentIds)),
    ]);
    const phoneByStudent = new Map<string, string>();
    for (const link of guardianLinks) {
      if (phoneByStudent.has(link.student_id)) continue;
      const phone = (Array.isArray(link.profiles) ? link.profiles[0] : link.profiles)?.phone;
      if (phone) phoneByStudent.set(link.student_id, phone);
    }
    const nameByStudent = new Map(absentStudentProfiles.map((p: any) => [p.id, p.full_name]));
    for (const studentId of absentStudentIds) {
      absentees.push({
        studentId,
        fullName: nameByStudent.get(studentId) || 'Student',
        guardianPhone: phoneByStudent.get(studentId) || null,
      });
    }
  }

  return { sections, enrollments, records, leaves, staffMembers, staffRecords, date, absentees };
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
        .select('*, school_exams!school_exam_schedules_exam_id_fkey(name), school_sections!school_exam_schedules_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
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
        .select('id, name, school_classes!school_sections_class_id_fkey(name)')
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
        .select('*, school_classes!school_fee_structures_class_id_fkey(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ),
    rows(
      db
        .from('school_fee_invoices')
        .select('*, profiles!school_fee_invoices_student_id_fkey(full_name), school_fee_structures!school_fee_invoices_fee_structure_id_fkey(name)')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('school_fee_payments')
        .select('*, school_fee_invoices!school_fee_payments_invoice_id_fkey(voucher_number), profiles!school_fee_payments_received_by_fkey(full_name)')
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

  // Phase 7a — WhatsApp quick-link reminders need a phone number to prefill wa.me with; guardian
  // phone lives on school_guardians -> profiles, not on the invoice/student row itself.
  const invoiceStudentIds = Array.from(new Set(invoices.map((item: any) => item.student_id).filter(Boolean)));
  const guardianPhoneByStudentId = new Map<string, string>();
  if (invoiceStudentIds.length) {
    const guardianLinks = await rows(
      db
        .from('school_guardians')
        .select('student_id, is_primary, profiles!school_guardians_guardian_id_fkey(phone)')
        .eq('organization_id', organizationId)
        .in('student_id', invoiceStudentIds)
        .order('is_primary', { ascending: false })
    );
    for (const link of guardianLinks) {
      if (guardianPhoneByStudentId.has(link.student_id)) continue;
      const phone = (Array.isArray(link.profiles) ? link.profiles[0] : link.profiles)?.phone;
      if (phone) guardianPhoneByStudentId.set(link.student_id, phone);
    }
  }
  const invoicesWithPhone = invoices.map((item: any) => ({
    ...item,
    guardianPhone: guardianPhoneByStudentId.get(item.student_id) || null,
  }));

  return { structures, invoices: invoicesWithPhone, payments, years, classes, students };
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
        .select('*, school_sections!school_homework_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
        .eq('organization_id', organizationId)
        .order('due_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('school_timetable_entries')
        .select(
          '*, school_sections!school_timetable_entries_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name)), profiles!school_timetable_entries_teacher_id_fkey(full_name)'
        )
        .eq('organization_id', organizationId)
        .order('day_of_week')
        .order('starts_at')
    ),
    rows(
      db
        .from('school_lesson_plans')
        .select('*, school_subject_offerings!school_lesson_plans_subject_offering_id_fkey(subject_name)')
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
        .select('id, name, school_classes!school_sections_class_id_fkey(name)')
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

// Phase 6c — per-announcement read-receipt stats. Joins school_notification_deliveries (in_app
// channel only — email/SMS/WhatsApp/push have no equivalent "read" concept in this app) to
// notifications.is_read via the notification_id link added alongside this feature.
export async function getAnnouncementReadStats(supabase: SupabaseClient, organizationId: string, announcementIds: string[]) {
  if (!announcementIds.length) return new Map<string, { delivered: number; read: number }>();
  const db = supabase as any;
  const { data } = await db
    .from('school_notification_deliveries')
    .select('announcement_id, notifications(is_read)')
    .eq('organization_id', organizationId)
    .eq('channel', 'in_app')
    .not('notification_id', 'is', null)
    .in('announcement_id', announcementIds);

  const stats = new Map<string, { delivered: number; read: number }>();
  for (const row of data || []) {
    const current = stats.get(row.announcement_id) || { delivered: 0, read: 0 };
    current.delivered += 1;
    const notification = Array.isArray(row.notifications) ? row.notifications[0] : row.notifications;
    if (notification?.is_read) current.read += 1;
    stats.set(row.announcement_id, current);
  }
  return stats;
}

export async function getSchoolCommunication(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [announcements, deliveries, campuses, messages] = await Promise.all([
    rows(
      db
        .from('school_announcements')
        .select('*, school_campuses!school_announcements_campus_id_fkey(name)')
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
        .select('id, student_id, percentage, grade, gpa, published_at, profiles!school_report_cards_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(200)
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
            .select('*, school_sections!school_timetable_entries_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
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
            .select('*, school_sections!school_homework_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
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
            .select('*, school_exams!school_report_cards_exam_id_fkey(name)')
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
    .select('id, section_id, extracted_name, extracted_roll_number, status, created_at, school_sections!school_pending_student_additions_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
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

// Phase 2c: who a teacher is allowed to open a direct_conversations thread with. Deliberately
// scoped as broadly as the existing PTM feature already scopes the reverse direction — a parent
// can already request a PTM meeting with ANY teacher in the org (see ptmTeachers in
// getSchoolPortalData below, not just their child's actual subject teachers) — so a teacher's
// messaging contact list here is "every guardian in the org", the same breadth, rather than a new
// narrower rule. The parent side of this feature reuses that existing ptmTeacherOptions list
// directly (see src/app/school/page.tsx) instead of a second query.
// get_or_create_direct_conversation (the direct-messaging migration) still independently enforces
// "one parent + one teacher, same organization" server-side regardless of what this list offers.
export async function getTeacherMessagingContacts(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const { data: guardians } = await db
    .from('school_guardians')
    .select('guardian_id, profiles!school_guardians_guardian_id_fkey(id, full_name, avatar_url)')
    .eq('organization_id', context.organization.id);

  const seen = new Map<string, any>();
  for (const link of guardians || []) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile || seen.has(profile.id)) continue;
    seen.set(profile.id, { profileId: profile.id, fullName: profile.full_name, avatarUrl: profile.avatar_url });
  }
  return Array.from(seen.values());
}

// Phase 6d — substitute teacher auto-suggestion. Pure aggregation over school_timetable_entries +
// school_staff_attendance + school_memberships: for each teacher marked absent on `date`, find
// their periods that day and which other active teachers have no clashing period at that time and
// aren't themselves absent. No new tracking table — this is computed fresh each time the admin
// views the page.
export async function getSubstituteSuggestions(supabase: SupabaseClient, context: SchoolContext, date: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const dayOfWeek = ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1=Monday..7=Sunday, matches school_timetable_entries convention

  const [teachers, absentRows, timetable] = await Promise.all([
    rows(
      db
        .from('school_memberships')
        .select('id, profile_id, profiles(full_name)')
        .eq('organization_id', organizationId)
        .eq('member_role', 'teacher')
        .eq('status', 'active')
    ),
    rows(
      db
        .from('school_staff_attendance')
        .select('membership_id')
        .eq('organization_id', organizationId)
        .eq('attendance_date', date)
        .eq('status', 'absent')
    ),
    rows(
      db
        .from('school_timetable_entries')
        .select('id, section_id, subject_name, teacher_id, starts_at, ends_at, school_sections(name)')
        .eq('organization_id', organizationId)
        .eq('day_of_week', dayOfWeek)
    ),
  ]);
  if (!teachers.length || !timetable.length) return [];

  const teacherByMembershipId = new Map(teachers.map((t: any) => [t.id, t]));
  const absentTeacherIds = new Set(
    absentRows.map((row: any) => teacherByMembershipId.get(row.membership_id)?.profile_id).filter(Boolean)
  );
  if (!absentTeacherIds.size) return [];

  const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && bStart < aEnd;
  const teacherNameByProfileId = new Map(
    teachers.map((t: any) => [t.profile_id, (Array.isArray(t.profiles) ? t.profiles[0] : t.profiles)?.full_name || 'Teacher'])
  );

  return timetable
    .filter((period: any) => absentTeacherIds.has(period.teacher_id))
    .map((period: any) => {
      const section = Array.isArray(period.school_sections) ? period.school_sections[0] : period.school_sections;
      const suggestions = teachers
        .filter((teacher: any) => teacher.profile_id !== period.teacher_id && !absentTeacherIds.has(teacher.profile_id))
        .filter(
          (teacher: any) =>
            !timetable.some(
              (other: any) =>
                other.teacher_id === teacher.profile_id && overlaps(period.starts_at, period.ends_at, other.starts_at, other.ends_at)
            )
        )
        .map((teacher: any) => ({ profileId: teacher.profile_id, fullName: teacherNameByProfileId.get(teacher.profile_id) }));
      return {
        periodId: period.id,
        sectionName: section?.name || 'Section',
        subjectName: period.subject_name,
        startsAt: period.starts_at,
        endsAt: period.ends_at,
        absentTeacherId: period.teacher_id,
        absentTeacherName: teacherNameByProfileId.get(period.teacher_id) || 'Teacher',
        suggestions: suggestions.slice(0, 3),
      };
    });
}

// Phase 6a — principal-facing teacher performance insights. Pure aggregation over existing
// tables, no new tracking table. "Completion rate" is reported as a raw count of distinct days
// with an attendance mark in the window (not a true percentage) because there is no existing
// "expected school day" calendar table to divide by — an honest simplification rather than a
// fabricated denominator.
export async function getTeacherPerformanceInsights(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const sinceTs = new Date(Date.now() - 30 * 86400000).toISOString();

  const teachers = await rows(
    db
      .from('school_memberships')
      .select('profile_id, profiles(full_name)')
      .eq('organization_id', organizationId)
      .eq('member_role', 'teacher')
      .eq('status', 'active')
  );
  if (!teachers.length) return [];
  const teacherIds = teachers.map((t: any) => t.profile_id);

  const [attendanceRows, testRows] = await Promise.all([
    rows(
      db
        .from('school_attendance_records')
        .select('marked_by, attendance_date')
        .eq('organization_id', organizationId)
        .gte('attendance_date', since)
        .in('marked_by', teacherIds)
    ),
    rows(db.from('teacher_generated_tests').select('created_by, created_at').in('created_by', teacherIds).gte('created_at', sinceTs)),
  ]);

  const attendanceDaysByTeacher = new Map<string, Set<string>>();
  for (const row of attendanceRows) {
    const set = attendanceDaysByTeacher.get(row.marked_by) || new Set<string>();
    set.add(row.attendance_date);
    attendanceDaysByTeacher.set(row.marked_by, set);
  }
  const testCountByTeacher = new Map<string, number>();
  for (const row of testRows) {
    testCountByTeacher.set(row.created_by, (testCountByTeacher.get(row.created_by) || 0) + 1);
  }

  return teachers
    .map((teacher: any) => {
      const profile = Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;
      return {
        profileId: teacher.profile_id,
        fullName: profile?.full_name || 'Teacher',
        attendanceDaysMarked: attendanceDaysByTeacher.get(teacher.profile_id)?.size || 0,
        testsCreated: testCountByTeacher.get(teacher.profile_id) || 0,
      };
    })
    .sort((a, b) => b.attendanceDaysMarked - a.attendanceDaysMarked);
}

// Phase 6f — dropout-risk early warning. A simple additive score (0-100, higher = more at risk)
// combining three existing signals, sorted highest-risk first. Deliberately linear/transparent
// (not a trained model) so a principal can see WHY a student scored high.
export async function getDropoutRiskScores(supabase: SupabaseClient, context: SchoolContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const since60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

  const enrollments = await rows(
    db
      .from('school_enrollments')
      .select('student_id, profiles!school_enrollments_student_id_fkey(full_name)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
  );
  if (!enrollments.length) return [];
  const studentIds = enrollments.map((e: any) => e.student_id);

  const [attendanceRows, invoiceRows, quizRows] = await Promise.all([
    rows(
      db
        .from('school_attendance_records')
        .select('student_id, status')
        .eq('organization_id', organizationId)
        .gte('attendance_date', since60)
        .in('student_id', studentIds)
    ),
    rows(
      db
        .from('school_fee_invoices')
        .select('student_id, status, due_date')
        .eq('organization_id', organizationId)
        .in('student_id', studentIds)
    ),
    rows(
      db
        .from('quiz_sessions')
        .select('user_id, score, started_at')
        .eq('status', 'COMPLETED')
        .in('user_id', studentIds)
        .order('started_at', { ascending: true })
        .limit(2000)
    ),
  ]);

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows) {
    const current = attendanceByStudent.get(row.student_id) || { present: 0, total: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') current.present += 1;
    attendanceByStudent.set(row.student_id, current);
  }

  const overdueByStudent = new Map<string, number>();
  for (const row of invoiceRows) {
    if (row.status === 'overdue') overdueByStudent.set(row.student_id, (overdueByStudent.get(row.student_id) || 0) + 1);
  }

  const scoresByStudent = new Map<string, number[]>();
  for (const row of quizRows) {
    if (row.score == null) continue;
    const list = scoresByStudent.get(row.user_id) || [];
    list.push(Number(row.score));
    scoresByStudent.set(row.user_id, list);
  }

  return enrollments
    .map((enrollment: any) => {
      const profile = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
      const attendance = attendanceByStudent.get(enrollment.student_id);
      const attendanceRate = attendance && attendance.total > 0 ? attendance.present / attendance.total : 1;
      const overdueInvoices = overdueByStudent.get(enrollment.student_id) || 0;
      const scores = scoresByStudent.get(enrollment.student_id) || [];
      const half = Math.floor(scores.length / 2);
      const firstHalfAvg = half > 0 ? scores.slice(0, half).reduce((a, b) => a + b, 0) / half : null;
      const secondHalfAvg = half > 0 ? scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half) : null;
      const decliningTrend = firstHalfAvg !== null && secondHalfAvg !== null && secondHalfAvg < firstHalfAvg - 10;

      // Additive risk score: attendance is the strongest signal (up to 50), fee default next (up
      // to 30), a declining quiz trend last (20) — weights are a simplification, not calibrated
      // against real dropout outcomes; treat as a triage sort order, not a certainty.
      let riskScore = Math.round((1 - attendanceRate) * 50);
      riskScore += Math.min(30, overdueInvoices * 15);
      if (decliningTrend) riskScore += 20;
      riskScore = Math.min(100, riskScore);

      return {
        studentId: enrollment.student_id,
        fullName: profile?.full_name || 'Student',
        riskScore,
        attendanceRate: Math.round(attendanceRate * 100),
        overdueInvoices,
        decliningQuizTrend: decliningTrend,
      };
    })
    .filter((s) => s.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore);
}
