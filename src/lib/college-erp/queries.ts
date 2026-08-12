import type { SupabaseClient } from '@supabase/supabase-js';
import type { CollegeContext } from './types';

// College-side mirror of src/lib/school-erp/queries.ts. PTM (parent-teacher meeting slots) and
// payroll are intentionally NOT ported here — those live in later school-only migrations
// (20260806.../20260807...) that were never mirrored for college; see
// docs/SCHOOL_COLLEGE_SEPARATION_TODO.md for the tracked follow-up. Everything else — the core
// operational surface (people, admissions, attendance incl. scan, exams incl. report cards,
// fees, academics, communication incl. directory messaging, reports, portal data) — is ported.

async function rows(query: PromiseLike<{ data: any[] | null; error: { message: string } | null }>): Promise<any[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCollegeOverview(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const today = new Date().toISOString().slice(0, 10);
  const [
    { count: students },
    { count: staff },
    { count: pendingAdmissions },
    { count: absentToday },
    { count: overdueInvoices },
    { count: assignmentsDueSoon },
    announcements,
    events,
  ] = await Promise.all([
    db.from('college_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    db
      .from('college_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('member_role', ['teacher', 'staff', 'accountant', 'admissions', 'admin']),
    db
      .from('college_admissions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['submitted', 'under_review', 'waitlisted']),
    db
      .from('college_attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('attendance_date', today)
      .in('status', ['absent', 'late']),
    db.from('college_fee_invoices').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['overdue', 'partial']),
    db
      .from('college_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('due_at', new Date().toISOString())
      .lte('due_at', new Date(Date.now() + 7 * 86400000).toISOString()),
    db
      .from('college_announcements')
      .select('id, title, priority, published_at')
      .eq('organization_id', organizationId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(5),
    db
      .from('college_calendar_events')
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
      assignmentsDueSoon: assignmentsDueSoon || 0,
    },
    announcements: announcements.data || [],
    events: events.data || [],
  };
}

export type CollegeAbsenceAlertRow = {
  id: string;
  status: 'absent' | 'late';
  studentId: string;
  studentName: string;
  sectionName: string;
  guardianPhone: string | null;
  guardianName: string | null;
};

export async function getCollegeTodayAbsences(supabase: SupabaseClient, context: CollegeContext): Promise<CollegeAbsenceAlertRow[]> {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const today = new Date().toISOString().slice(0, 10);

  const records = await rows(
    db
      .from('college_attendance_records')
      .select('id, status, student_id, profiles!college_attendance_records_student_id_fkey(id, full_name), college_sections(name, college_semesters(name))')
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
      .from('college_guardians')
      .select('student_id, is_primary, receives_alerts, guardian:profiles!college_guardians_guardian_id_fkey(full_name, phone)')
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
    const section = Array.isArray(row.college_sections) ? row.college_sections[0] : row.college_sections;
    const semester = section ? (Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters) : null;
    const guardian = guardianByStudent.get(row.student_id);
    return {
      id: row.id,
      status: row.status,
      studentId: row.student_id,
      studentName: profile?.full_name || 'Student',
      sectionName: [semester?.name, section?.name].filter(Boolean).join(' - '),
      guardianPhone: guardian?.phone || null,
      guardianName: guardian?.full_name || null,
    };
  });
}

export async function getCollegeAcademicSetup(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [campuses, departments, years, semesters, sections, offerings, profiles] = await Promise.all([
    rows(db.from('college_campuses').select('*').eq('organization_id', organizationId).order('is_main', { ascending: false }).order('name')),
    rows(db.from('college_academic_departments').select('*').eq('organization_id', organizationId).order('name')),
    rows(db.from('college_academic_years').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(
      db
        .from('college_semesters')
        .select('*, college_academic_departments(name), college_academic_years(name)')
        .eq('organization_id', organizationId)
        .order('display_order')
        .order('name')
    ),
    rows(
      db
        .from('college_sections')
        .select('*, college_semesters(name), profiles!college_sections_advisor_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('name')
    ),
    rows(
      db
        .from('college_course_offerings')
        .select('*, college_sections(name), profiles!college_course_offerings_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('course_name')
    ),
    rows(
      db
        .from('college_memberships')
        .select('profile_id, member_role, profiles(full_name, email)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('member_role', ['teacher', 'admin'])
    ),
  ]);
  return { campuses, departments, years, semesters, sections, offerings, profiles };
}

export async function getCollegePeople(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [memberships, enrollments, guardians, sections, years, planSettings, activeStudents] = await Promise.all([
    rows(
      db
        .from('college_memberships')
        .select('*, profiles(id, full_name, email, phone, avatar_url)')
        .eq('organization_id', organizationId)
        .order('member_role')
        .order('joined_at', { ascending: false })
    ),
    rows(
      db
        .from('college_enrollments')
        .select('*, profiles!college_enrollments_student_id_fkey(id, full_name, email), college_sections(name, college_semesters(name))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ),
    rows(
      db
        .from('college_guardians')
        .select('*, student:profiles!college_guardians_student_id_fkey(full_name), guardian:profiles!college_guardians_guardian_id_fkey(full_name, email)')
        .eq('organization_id', organizationId)
    ),
    rows(db.from('college_sections').select('id, name, college_semesters(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('college_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('college_organization_plan_settings').select('*').eq('organization_id', organizationId).limit(1)),
    db.from('college_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
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

export async function getCollegeAdmissions(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  return rows(
    db
      .from('college_admissions')
      .select('*, college_campuses(name), college_academic_years(name), college_admission_documents(id, document_type, file_name, verification_status)')
      .eq('organization_id', context.organization.id)
      .order('created_at', { ascending: false })
  );
}

export async function getCollegeAttendance(supabase: SupabaseClient, context: CollegeContext, date: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [sections, enrollments, records, leaves, staffMembers, staffRecords] = await Promise.all([
    rows(db.from('college_sections').select('id, name, college_semesters(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(
      db
        .from('college_enrollments')
        .select('id, section_id, student_id, roll_number, profiles!college_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
    rows(db.from('college_attendance_records').select('*').eq('organization_id', organizationId).eq('attendance_date', date)),
    rows(
      db
        .from('college_leave_requests')
        .select('*, profiles!college_leave_requests_requester_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    rows(
      db
        .from('college_memberships')
        .select('id, member_role, employee_code, profiles(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('member_role', ['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant'])
        .order('member_role')
    ),
    rows(db.from('college_staff_attendance').select('*').eq('organization_id', organizationId).eq('attendance_date', date)),
  ]);
  return { sections, enrollments, records, leaves, staffMembers, staffRecords, date };
}

export async function getCollegeExamReportCards(supabase: SupabaseClient, context: CollegeContext, examId: string) {
  const db = supabase as any;
  const { data: exam } = await db.from('college_exams').select('id, name, term').eq('id', examId).eq('organization_id', context.organization.id).maybeSingle();
  if (!exam) return null;

  const cards = await rows(
    db
      .from('college_report_cards')
      .select('*, profiles!college_report_cards_student_id_fkey(full_name)')
      .eq('organization_id', context.organization.id)
      .eq('exam_id', examId)
      .not('published_at', 'is', null)
      .order('class_position', { ascending: true, nullsFirst: false })
  );
  return { exam, cards };
}

export async function getCollegeExams(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [exams, schedules, marks, sections, years, offerings, enrollments] = await Promise.all([
    rows(db.from('college_exams').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(
      db
        .from('college_exam_schedules')
        .select('*, college_exams(name), college_sections(name, college_semesters(name))')
        .eq('organization_id', organizationId)
        .order('exam_date')
    ),
    rows(
      db
        .from('college_exam_marks')
        .select('*, profiles!college_exam_marks_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('entered_at', { ascending: false })
        .limit(500)
    ),
    rows(db.from('college_sections').select('id, name, college_semesters(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('college_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('college_course_offerings').select('id, section_id, course_name').eq('organization_id', organizationId).order('course_name')),
    rows(
      db
        .from('college_enrollments')
        .select('section_id, student_id, roll_number, profiles!college_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
  ]);
  return { exams, schedules, marks, sections, years, offerings, enrollments };
}

export async function getCollegeFees(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [structures, invoices, payments, years, semesters, students] = await Promise.all([
    rows(db.from('college_fee_structures').select('*, college_semesters(name)').eq('organization_id', organizationId).order('created_at', { ascending: false })),
    rows(
      db
        .from('college_fee_invoices')
        .select('*, profiles!college_fee_invoices_student_id_fkey(full_name), college_fee_structures(name)')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('college_fee_payments')
        .select('*, college_fee_invoices(voucher_number), profiles!college_fee_payments_received_by_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('paid_at', { ascending: false })
        .limit(500)
    ),
    rows(db.from('college_academic_years').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(db.from('college_semesters').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(
      db
        .from('college_enrollments')
        .select('student_id, registration_number, profiles!college_enrollments_student_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
    ),
  ]);
  return { structures, invoices, payments, years, semesters, students };
}

export async function getCollegeAcademics(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [assignments, timetable, lessonPlans, events, sections, offerings] = await Promise.all([
    rows(
      db
        .from('college_assignments')
        .select('*, college_sections(name, college_semesters(name))')
        .eq('organization_id', organizationId)
        .order('due_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('college_timetable_slots')
        .select('*, college_sections(name, college_semesters(name)), profiles!college_timetable_slots_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('day_of_week')
        .order('starts_at')
    ),
    rows(
      db
        .from('college_lesson_plans')
        .select('*, college_course_offerings(course_name)')
        .eq('organization_id', organizationId)
        .order('lesson_date', { ascending: false })
        .limit(200)
    ),
    rows(db.from('college_calendar_events').select('*').eq('organization_id', organizationId).order('starts_at', { ascending: false }).limit(200)),
    rows(db.from('college_sections').select('id, name, college_semesters(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('college_course_offerings').select('id, section_id, course_name, teacher_id').eq('organization_id', organizationId).order('course_name')),
  ]);
  return { assignments, timetable, lessonPlans, events, sections, offerings };
}

export async function getCollegeCommunication(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [announcements, deliveries, campuses, messages] = await Promise.all([
    rows(db.from('college_announcements').select('*, college_campuses(name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200)),
    rows(
      db
        .from('college_notification_deliveries')
        .select('channel, status, attempts, last_error, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
    ),
    rows(db.from('college_campuses').select('id, name').eq('organization_id', organizationId).eq('is_active', true)),
    rows(
      db
        .from('college_contact_messages')
        .select('*, profiles!college_contact_messages_sender_id_fkey(full_name, email)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200)
    ),
  ]);
  return { announcements, deliveries, campuses, messages };
}

export async function getCollegeReports(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [attendance, invoices, reportCards, admissions, auditLogs] = await Promise.all([
    rows(
      db
        .from('college_attendance_records')
        .select('status, attendance_date')
        .eq('organization_id', organizationId)
        .gte('attendance_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
    ),
    rows(db.from('college_fee_invoices').select('status, total_amount, paid_amount, due_date').eq('organization_id', organizationId)),
    rows(db.from('college_report_cards').select('percentage, grade, gpa, published_at').eq('organization_id', organizationId).not('published_at', 'is', null)),
    rows(db.from('college_admissions').select('status, created_at').eq('organization_id', organizationId)),
    rows(db.from('college_audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100)),
  ]);
  return { attendance, invoices, reportCards, admissions, auditLogs };
}

export async function getCollegePortalData(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const role = context.membership.member_role;
  let studentIds: string[] = [];
  if (role === 'student') studentIds = [context.userId];
  if (role === 'parent') {
    const guardians = await rows(
      db.from('college_guardians').select('student_id').eq('organization_id', organizationId).eq('guardian_id', context.userId)
    );
    studentIds = guardians.map((item: any) => item.student_id);
  }
  const enrollmentRows = studentIds.length
    ? await rows(
        db
          .from('college_enrollments')
          .select('section_id, student_id')
          .eq('organization_id', organizationId)
          .in('student_id', studentIds)
          .eq('status', 'active')
      )
    : [];
  const sectionIds = Array.from(new Set(enrollmentRows.map((item: any) => item.section_id)));
  const leaveRequesterIds = studentIds.length ? studentIds : [context.userId];

  const [announcements, events, timetable, assignments, attendance, reportCards, invoices, students, leaves, messages] = await Promise.all([
    rows(
      db
        .from('college_announcements')
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
        .from('college_calendar_events')
        .select('id, title, event_type, starts_at, ends_at')
        .eq('organization_id', organizationId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(20)
    ),
    sectionIds.length
      ? rows(
          db
            .from('college_timetable_slots')
            .select('*, college_sections(name, college_semesters(name))')
            .eq('organization_id', organizationId)
            .in('section_id', sectionIds)
            .order('day_of_week')
            .order('starts_at')
        )
      : Promise.resolve([]),
    sectionIds.length
      ? rows(
          db
            .from('college_assignments')
            .select('*, college_sections(name, college_semesters(name))')
            .eq('organization_id', organizationId)
            .in('section_id', sectionIds)
            .order('due_at', { ascending: false })
            .limit(50)
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('college_attendance_records')
            .select('*, profiles!college_attendance_records_student_id_fkey(full_name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .order('attendance_date', { ascending: false })
            .limit(120)
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('college_report_cards')
            .select('*, college_exams(name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .not('published_at', 'is', null)
            .order('published_at', { ascending: false })
        )
      : Promise.resolve([]),
    studentIds.length
      ? rows(
          db
            .from('college_fee_invoices')
            .select('*, profiles!college_fee_invoices_student_id_fkey(full_name)')
            .eq('organization_id', organizationId)
            .in('student_id', studentIds)
            .order('due_date', { ascending: false })
        )
      : Promise.resolve([]),
    studentIds.length ? rows(db.from('profiles').select('id, full_name, avatar_url').in('id', studentIds)) : Promise.resolve([]),
    rows(
      db
        .from('college_leave_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .in('requester_id', leaveRequesterIds)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
    rows(
      db
        .from('college_contact_messages')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sender_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
  ]);
  return { announcements, events, timetable, assignments, attendance, reportCards, invoices, students, leaves, messages };
}

export type PendingCollegeStudentAddition = {
  id: string;
  section_id: string;
  extracted_name: string;
  extracted_roll_number: string | null;
  status: string;
  created_at: string;
  section: { name: string; semesterName: string | null } | null;
};

export async function getPendingCollegeStudentAdditions(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PendingCollegeStudentAddition[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('college_pending_student_additions')
    .select('id, section_id, extracted_name, extracted_roll_number, status, created_at, college_sections(name, college_semesters(name))')
    .eq('organization_id', organizationId)
    .eq('status', 'pending_principal_approval')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const section = Array.isArray(row.college_sections) ? row.college_sections[0] : row.college_sections;
    const semester = section ? (Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters) : null;
    return {
      id: row.id,
      section_id: row.section_id,
      extracted_name: row.extracted_name,
      extracted_roll_number: row.extracted_roll_number,
      status: row.status,
      created_at: row.created_at,
      section: section ? { name: section.name, semesterName: semester?.name || null } : null,
    };
  });
}
