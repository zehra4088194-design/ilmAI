import type { SupabaseClient } from '@supabase/supabase-js';
import { computeGrowthInsights } from '../school-erp/growth';
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
      .select('id, status, student_id, profiles!college_attendance_records_student_id_fkey(id, full_name), college_sections!college_attendance_records_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
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
        .select('*, college_academic_departments!college_semesters_department_id_fkey(name), college_academic_years!college_semesters_academic_year_id_fkey(name)')
        .eq('organization_id', organizationId)
        .order('display_order')
        .order('name')
    ),
    rows(
      db
        .from('college_sections')
        .select('*, college_semesters!college_sections_semester_id_fkey(name), profiles!college_sections_advisor_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('name')
    ),
    rows(
      db
        .from('college_course_offerings')
        .select('*, college_sections!college_course_offerings_section_id_fkey(name), profiles!college_course_offerings_teacher_id_fkey(full_name)')
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
        .select('*, profiles!college_enrollments_student_id_fkey(id, full_name, email), college_sections!college_enrollments_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ),
    rows(
      db
        .from('college_guardians')
        .select('*, student:profiles!college_guardians_student_id_fkey(full_name), guardian:profiles!college_guardians_guardian_id_fkey(full_name, email)')
        .eq('organization_id', organizationId)
    ),
    rows(db.from('college_sections').select('id, name, college_semesters!college_sections_semester_id_fkey(name)').eq('organization_id', organizationId).eq('is_active', true)),
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
      .select('*, college_campuses!college_admissions_campus_id_fkey(name), college_academic_years!college_admissions_academic_year_id_fkey(name), college_admission_documents!college_admission_documents_admission_id_fkey(id, document_type, file_name, verification_status)')
      .eq('organization_id', context.organization.id)
      .order('created_at', { ascending: false })
  );
}

export async function getCollegeAttendance(supabase: SupabaseClient, context: CollegeContext, date: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [sections, enrollments, records, leaves, staffMembers, staffRecords] = await Promise.all([
    rows(db.from('college_sections').select('id, name, college_semesters!college_sections_semester_id_fkey(name)').eq('organization_id', organizationId).eq('is_active', true)),
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

// College-side mirror of getExamTabulation (src/lib/school-erp/queries.ts).
export async function getCollegeExamTabulation(supabase: SupabaseClient, context: CollegeContext, examId: string) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const { data: exam } = await db
    .from('college_exams')
    .select('id, name, term, academic_year_id')
    .eq('id', examId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!exam) return null;

  const cards = await rows(
    db
      .from('college_report_cards')
      .select(
        'id, student_id, summary, total_marks, obtained_marks, percentage, gpa, grade, class_position, profiles!college_report_cards_student_id_fkey(full_name)'
      )
      .eq('organization_id', organizationId)
      .eq('exam_id', examId)
      .not('published_at', 'is', null)
  );
  if (!cards.length) return { exam, subjects: [] as string[], sections: [] as string[], rows: [] as any[] };

  const studentIds = cards.map((card: any) => card.student_id);
  const enrollments = await rows(
    db
      .from('college_enrollments')
      .select(
        'student_id, roll_number, section_id, college_sections!college_enrollments_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))'
      )
      .eq('organization_id', organizationId)
      .eq('academic_year_id', exam.academic_year_id)
      .in('student_id', studentIds)
  );
  const enrollmentByStudent = new Map(enrollments.map((e: any) => [e.student_id, e]));

  const subjects: string[] = [];
  for (const card of cards) {
    for (const subject of card.summary?.subjects || []) {
      if (!subjects.includes(subject.subject)) subjects.push(subject.subject);
    }
  }

  const tableRows = cards.map((card: any) => {
    const profile = Array.isArray(card.profiles) ? card.profiles[0] : card.profiles;
    const enrollment = enrollmentByStudent.get(card.student_id) as any;
    const section = enrollment?.college_sections
      ? Array.isArray(enrollment.college_sections)
        ? enrollment.college_sections[0]
        : enrollment.college_sections
      : null;
    const semester = section
      ? Array.isArray(section.college_semesters)
        ? section.college_semesters[0]
        : section.college_semesters
      : null;
    const marksBySubject = new Map<string, any>((card.summary?.subjects || []).map((s: any) => [s.subject, s]));
    return {
      studentId: card.student_id,
      studentName: profile?.full_name || 'Student',
      rollNumber: enrollment?.roll_number || '',
      sectionLabel: section ? [semester?.name, section.name].filter(Boolean).join(' - ') : 'Unassigned',
      marksBySubject,
      totalMarks: Number(card.total_marks || 0),
      obtainedMarks: Number(card.obtained_marks || 0),
      percentage: Number(card.percentage || 0),
      grade: card.grade,
      gpa: card.gpa,
      classPosition: card.class_position,
    };
  });

  const sections = Array.from(new Set(tableRows.map((row) => row.sectionLabel))).sort();
  return { exam, subjects, sections, rows: tableRows };
}

// College-side mirror of getSchoolIdCardRoster.
export async function getCollegeIdCardRoster(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [sections, enrollments] = await Promise.all([
    rows(
      db
        .from('college_sections')
        .select('id, name, college_semesters!college_sections_semester_id_fkey(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name')
    ),
    rows(
      db
        .from('college_enrollments')
        .select(
          'student_id, registration_number, section_id, profiles!college_enrollments_student_id_fkey(id, full_name, avatar_url), college_sections!college_enrollments_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))'
        )
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('roll_number')
    ),
  ]);

  const studentIds = enrollments.map((e: any) => e.student_id);
  const guardianPhoneByStudent = new Map<string, string>();
  const guardianNameByStudent = new Map<string, string>();
  if (studentIds.length) {
    const guardianLinks = await rows(
      db
        .from('college_guardians')
        .select('student_id, is_primary, profiles!college_guardians_guardian_id_fkey(full_name, phone)')
        .eq('organization_id', organizationId)
        .in('student_id', studentIds)
        .order('is_primary', { ascending: false })
    );
    for (const link of guardianLinks) {
      if (guardianPhoneByStudent.has(link.student_id)) continue;
      const guardian = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
      if (guardian?.phone) guardianPhoneByStudent.set(link.student_id, guardian.phone);
      if (guardian?.full_name) guardianNameByStudent.set(link.student_id, guardian.full_name);
    }
  }

  const students = enrollments.map((e: any) => {
    const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    const section = Array.isArray(e.college_sections) ? e.college_sections[0] : e.college_sections;
    const semester = section
      ? Array.isArray(section.college_semesters)
        ? section.college_semesters[0]
        : section.college_semesters
      : null;
    return {
      studentId: e.student_id,
      sectionId: e.section_id,
      fullName: profile?.full_name || 'Student',
      photoUrl: profile?.avatar_url || null,
      idNumber: e.registration_number,
      classLabel: section ? [semester?.name, section.name].filter(Boolean).join(' - ') : '',
      guardianName: guardianNameByStudent.get(e.student_id) || null,
      guardianPhone: guardianPhoneByStudent.get(e.student_id) || null,
    };
  });

  const sectionOptions = sections.map((section: any) => ({
    id: section.id,
    label: [section.college_semesters?.name, section.name].filter(Boolean).join(' - '),
  }));

  return { sections: sectionOptions, students };
}

export async function getCollegeExams(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [exams, schedules, marks, sections, years, offerings, enrollments] = await Promise.all([
    rows(db.from('college_exams').select('*').eq('organization_id', organizationId).order('starts_on', { ascending: false })),
    rows(
      db
        .from('college_exam_schedules')
        .select('*, college_exams!college_exam_schedules_exam_id_fkey(name), college_sections!college_exam_schedules_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
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
    rows(db.from('college_sections').select('id, name, college_semesters!college_sections_semester_id_fkey(name)').eq('organization_id', organizationId).eq('is_active', true)),
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
    rows(db.from('college_fee_structures').select('*, college_semesters!college_fee_structures_semester_id_fkey(name)').eq('organization_id', organizationId).order('created_at', { ascending: false })),
    rows(
      db
        .from('college_fee_invoices')
        .select('*, profiles!college_fee_invoices_student_id_fkey(full_name), college_fee_structures!college_fee_invoices_fee_structure_id_fkey(name)')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false })
        .limit(500)
    ),
    rows(
      db
        .from('college_fee_payments')
        .select('*, college_fee_invoices!college_fee_payments_invoice_id_fkey(voucher_number), profiles!college_fee_payments_received_by_fkey(full_name)')
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

// College-side mirror of getSchoolDefaulters (src/lib/school-erp/queries.ts).
export async function getCollegeDefaulters(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const invoices = await rows(
    db
      .from('college_fee_invoices')
      .select('id, student_id, voucher_number, due_date, total_amount, paid_amount, status, profiles!college_fee_invoices_student_id_fkey(full_name)')
      .eq('organization_id', organizationId)
      .in('status', ['overdue', 'partial', 'issued'])
      .order('due_date', { ascending: true })
      .limit(1000)
  );
  const today = new Date();
  const overdue = invoices
    .map((item: any) => {
      const balance = Math.max(0, Number(item.total_amount) - Number(item.paid_amount));
      const dueDate = new Date(`${item.due_date}T00:00:00Z`);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      return { ...item, balance, daysOverdue };
    })
    .filter((item: any) => item.balance > 0 && item.daysOverdue > 0);

  const studentIds = Array.from(new Set(overdue.map((item: any) => item.student_id)));
  const guardianPhoneByStudentId = new Map<string, string>();
  if (studentIds.length) {
    const guardianLinks = await rows(
      db
        .from('college_guardians')
        .select('student_id, is_primary, profiles!college_guardians_guardian_id_fkey(phone)')
        .eq('organization_id', organizationId)
        .in('student_id', studentIds)
        .order('is_primary', { ascending: false })
    );
    for (const link of guardianLinks) {
      if (guardianPhoneByStudentId.has(link.student_id)) continue;
      const phone = (Array.isArray(link.profiles) ? link.profiles[0] : link.profiles)?.phone;
      if (phone) guardianPhoneByStudentId.set(link.student_id, phone);
    }
  }
  return overdue
    .map((item: any) => ({ ...item, guardianPhone: guardianPhoneByStudentId.get(item.student_id) || null }))
    .sort((a: any, b: any) => b.balance - a.balance);
}

// College-side mirror of getSchoolFamilyAccounts.
export async function getCollegeFamilyAccounts(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [guardianLinks, invoices] = await Promise.all([
    rows(
      db
        .from('college_guardians')
        .select(
          'student_id, guardian_id, guardian:profiles!college_guardians_guardian_id_fkey(id, full_name, phone), student:profiles!college_guardians_student_id_fkey(id, full_name)'
        )
        .eq('organization_id', organizationId)
    ),
    rows(
      db
        .from('college_fee_invoices')
        .select('id, student_id, voucher_number, due_date, billing_period, total_amount, paid_amount, status')
        .eq('organization_id', organizationId)
        .not('status', 'in', '(cancelled,waived)')
    ),
  ]);

  const byGuardian = new Map<string, { guardian: any; students: Map<string, any> }>();
  for (const link of guardianLinks) {
    const guardian = Array.isArray(link.guardian) ? link.guardian[0] : link.guardian;
    const student = Array.isArray(link.student) ? link.student[0] : link.student;
    if (!guardian || !student) continue;
    const bucket = byGuardian.get(guardian.id) || { guardian, students: new Map() };
    bucket.students.set(student.id, student);
    byGuardian.set(guardian.id, bucket);
  }

  const invoicesByStudent = new Map<string, any[]>();
  for (const invoice of invoices) {
    const list = invoicesByStudent.get(invoice.student_id) || [];
    list.push(invoice);
    invoicesByStudent.set(invoice.student_id, list);
  }

  return Array.from(byGuardian.values())
    .filter((bucket) => bucket.students.size > 1)
    .map((bucket) => {
      const children = Array.from(bucket.students.values()).map((student: any) => {
        const studentInvoices = invoicesByStudent.get(student.id) || [];
        const pending = studentInvoices.reduce(
          (sum: number, inv: any) => sum + Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount)),
          0
        );
        return { student, invoices: studentInvoices, pending };
      });
      return {
        guardian: bucket.guardian,
        children,
        totalPending: children.reduce((sum, child) => sum + child.pending, 0),
      };
    })
    .sort((a, b) => b.totalPending - a.totalPending);
}

// College-side mirror of getSchoolLedger.
export async function getCollegeLedger(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  const sinceIso = since.toISOString().slice(0, 10);

  const [payments, expenses] = await Promise.all([
    rows(
      db.from('college_fee_payments').select('amount, paid_at').eq('organization_id', organizationId).gte('paid_at', sinceIso)
    ),
    rows(
      db
        .from('college_expenses')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('expense_date', sinceIso)
        .order('expense_date', { ascending: false })
    ),
  ]);

  const monthKey = (value: string) => value.slice(0, 7);
  const collectedByMonth = new Map<string, number>();
  for (const payment of payments) {
    const key = monthKey(payment.paid_at);
    collectedByMonth.set(key, (collectedByMonth.get(key) || 0) + Number(payment.amount));
  }
  const expensesByMonth = new Map<string, number>();
  for (const expense of expenses) {
    const key = monthKey(expense.expense_date);
    expensesByMonth.set(key, (expensesByMonth.get(key) || 0) + Number(expense.amount));
  }
  const months: string[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const summary = months.map((month) => ({
    month,
    collected: collectedByMonth.get(month) || 0,
    expenses: expensesByMonth.get(month) || 0,
  }));
  const totalCollected = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  return { summary, expenses, totalCollected, totalExpenses, netBalance: totalCollected - totalExpenses };
}

export async function getCollegeAcademics(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [assignments, timetable, lessonPlans, events, sections, offerings] = await Promise.all([
    rows(
      db
        .from('college_assignments')
        .select('*, college_sections!college_assignments_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
        .eq('organization_id', organizationId)
        .order('due_at', { ascending: false })
        .limit(200)
    ),
    rows(
      db
        .from('college_timetable_slots')
        .select('*, college_sections!college_timetable_slots_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name)), profiles!college_timetable_slots_teacher_id_fkey(full_name)')
        .eq('organization_id', organizationId)
        .order('day_of_week')
        .order('starts_at')
    ),
    rows(
      db
        .from('college_lesson_plans')
        .select('*, college_course_offerings!college_lesson_plans_course_offering_id_fkey(course_name)')
        .eq('organization_id', organizationId)
        .order('lesson_date', { ascending: false })
        .limit(200)
    ),
    rows(db.from('college_calendar_events').select('*').eq('organization_id', organizationId).order('starts_at', { ascending: false }).limit(200)),
    rows(db.from('college_sections').select('id, name, college_semesters!college_sections_semester_id_fkey(name)').eq('organization_id', organizationId).eq('is_active', true)),
    rows(db.from('college_course_offerings').select('id, section_id, course_name, teacher_id').eq('organization_id', organizationId).order('course_name')),
  ]);
  return { assignments, timetable, lessonPlans, events, sections, offerings };
}

export async function getCollegeCommunication(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const [announcements, deliveries, campuses, messages, sectionRows] = await Promise.all([
    rows(db.from('college_announcements').select('*, college_campuses!college_announcements_campus_id_fkey(name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200)),
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
    rows(
      db
        .from('college_sections')
        .select('id, name, college_semesters!college_sections_semester_id_fkey(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
    ),
  ]);
  const sections = sectionRows.map((row: any) => {
    const semester = Array.isArray(row.college_semesters) ? row.college_semesters[0] : row.college_semesters;
    return { id: row.id, label: [semester?.name, row.name].filter(Boolean).join(' - ') };
  });
  return { announcements, deliveries, campuses, messages, sections };
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

// Phase: "College Growth" — deterministic, no AI call. See src/lib/school-erp/growth.ts for the math
// (college has no "class" concept; the section's parent semester stands in for it).
export async function getCollegeGrowthInsights(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const organizationId = context.organization.id;
  const since6mo = new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10);
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [enrollmentEvents, attendance6mo, invoices, sectionAttendanceRaw, activeCount] = await Promise.all([
    rows(
      db
        .from('college_enrollments')
        .select('enrolled_on, status, updated_at')
        .eq('organization_id', organizationId)
        .or(`enrolled_on.gte.${since6mo},updated_at.gte.${since6mo}`)
    ),
    rows(
      db
        .from('college_attendance_records')
        .select('status, attendance_date')
        .eq('organization_id', organizationId)
        .gte('attendance_date', since6mo)
    ),
    rows(
      db
        .from('college_fee_invoices')
        .select('status, total_amount, paid_amount, due_date')
        .eq('organization_id', organizationId)
        .gte('due_date', since6mo)
    ),
    rows(
      db
        .from('college_attendance_records')
        .select('status, college_sections!college_attendance_records_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
        .eq('organization_id', organizationId)
        .gte('attendance_date', since30)
    ),
    db
      .from('college_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ]);

  const sectionAttendance = sectionAttendanceRaw.map((row: any) => {
    const section = Array.isArray(row.college_sections) ? row.college_sections[0] : row.college_sections;
    const semester = section ? (Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters) : null;
    return { status: row.status, label: [semester?.name, section?.name].filter(Boolean).join(' - ') || 'Unassigned' };
  });

  return computeGrowthInsights({
    currency: context.organization.currency,
    activeStudents: Number(activeCount.count || 0),
    enrollmentEvents,
    attendance60d: attendance6mo,
    invoices,
    sectionAttendance,
    today,
  });
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
            .select('*, college_sections!college_timetable_slots_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
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
            .select('*, college_sections!college_assignments_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
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
            .select('*, college_exams!college_report_cards_exam_id_fkey(name)')
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
    .select('id, section_id, extracted_name, extracted_roll_number, status, created_at, college_sections!college_pending_student_additions_section_id_fkey(name, college_semesters!college_sections_semester_id_fkey(name))')
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

// Phase 2c (college portal parity) — mirrors getTeacherMessagingContacts /
// school/page.tsx's ptmTeacherOptions reuse on the school side. College has no PTM feature to
// reuse a contact list from, so both directions here are freshly written, kept at the same
// "everyone in org" breadth as the school side for consistency.
export async function getCollegeTeacherMessagingContacts(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const { data: guardians } = await db
    .from('college_guardians')
    .select('guardian_id, profiles!college_guardians_guardian_id_fkey(id, full_name, avatar_url)')
    .eq('organization_id', context.organization.id);

  const seen = new Map<string, any>();
  for (const link of guardians || []) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    if (!profile || seen.has(profile.id)) continue;
    seen.set(profile.id, { profileId: profile.id, fullName: profile.full_name, avatarUrl: profile.avatar_url });
  }
  return Array.from(seen.values());
}

export async function getCollegeParentMessagingContacts(supabase: SupabaseClient, context: CollegeContext) {
  const db = supabase as any;
  const { data: teachers } = await db
    .from('college_memberships')
    .select('profile_id, profiles(full_name, avatar_url)')
    .eq('organization_id', context.organization.id)
    .eq('member_role', 'teacher')
    .eq('status', 'active');

  return (teachers || []).map((teacher: any) => {
    const profile = Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;
    return { profileId: teacher.profile_id, fullName: profile?.full_name || 'Teacher', avatarUrl: profile?.avatar_url || null };
  });
}
