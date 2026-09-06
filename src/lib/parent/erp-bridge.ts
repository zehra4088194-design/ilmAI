// Bridges the consumer-facing parent_student_links world with the institutional
// school_guardians / college_guardians world. A linked child may also be enrolled in a
// school or college where this same parent account is registered as a guardian — when that's
// the case we surface a read-only Homework/Attendance/Exam Results snapshot on the Ilmai Family
// dashboard instead of duplicating the school/college ERP portal. Children with no ERP link
// simply come back with erpLinked: false.

export interface FamilyHomeworkItem {
  id: string;
  title: string;
  due_at: string | null;
  overdue: boolean;
}

export interface FamilyExamResult {
  examId: string;
  examName: string;
  term: string | null;
  obtainedMarks: number | null;
  totalMarks: number | null;
  percentage: number | null;
  grade: string | null;
  classPosition: number | null;
  publishedAt: string | null;
}

export interface FamilyErpEntry {
  erpLinked: true;
  orgType: 'school' | 'college';
  organizationId: string;
  homework: {
    upcoming: FamilyHomeworkItem[];
    overdueCount: number;
  };
  attendance: {
    presentCount: number;
    absentCount: number;
    lateCount: number;
    totalMarked: number;
    percentage: number | null;
  };
  // Only exams the school/college has actually published a report card for — a draft/unpublished
  // mark entry never reaches a parent, same rule the school's own report-card screen follows.
  examResults: FamilyExamResult[];
}

export type FamilyErpMap = Record<string, FamilyErpEntry | { erpLinked: false }>;

async function loadForOrgType(
  admin: any,
  orgType: 'school' | 'college',
  parentId: string,
  studentIds: string[]
): Promise<Map<string, { organizationId: string; sectionId: string }>> {
  const guardianTable = orgType === 'school' ? 'school_guardians' : 'college_guardians';
  const enrollmentTable = orgType === 'school' ? 'school_enrollments' : 'college_enrollments';

  const { data: guardianRows } = await (admin.from(guardianTable) as any)
    .select('student_id, organization_id')
    .eq('guardian_id', parentId)
    .in('student_id', studentIds);

  const linked = (guardianRows || []) as { student_id: string; organization_id: string }[];
  if (!linked.length) return new Map();

  const { data: enrollmentRows } = await (admin.from(enrollmentTable) as any)
    .select('student_id, organization_id, section_id')
    .in(
      'student_id',
      linked.map((row) => row.student_id)
    )
    .eq('status', 'active');

  const result = new Map<string, { organizationId: string; sectionId: string }>();
  for (const guardian of linked) {
    const enrollment = ((enrollmentRows || []) as any[]).find(
      (row) => row.student_id === guardian.student_id && row.organization_id === guardian.organization_id
    );
    if (enrollment) {
      result.set(guardian.student_id, { organizationId: enrollment.organization_id, sectionId: enrollment.section_id });
    }
  }
  return result;
}

export async function getFamilyErpData(
  admin: any,
  parentId: string,
  studentIds: string[]
): Promise<FamilyErpMap> {
  const result: FamilyErpMap = {};
  for (const studentId of studentIds) result[studentId] = { erpLinked: false };
  if (!studentIds.length) return result;

  const [schoolLinks, collegeLinks] = await Promise.all([
    loadForOrgType(admin, 'school', parentId, studentIds),
    loadForOrgType(admin, 'college', parentId, studentIds),
  ]);

  const entries: { studentId: string; orgType: 'school' | 'college'; organizationId: string; sectionId: string }[] = [];
  for (const [studentId, info] of schoolLinks) entries.push({ studentId, orgType: 'school', ...info });
  for (const [studentId, info] of collegeLinks) {
    if (!schoolLinks.has(studentId)) entries.push({ studentId, orgType: 'college', ...info });
  }
  if (!entries.length) return result;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const now = new Date().toISOString();

  await Promise.all(
    entries.map(async (entry) => {
      const homeworkTable = entry.orgType === 'school' ? 'school_homework' : 'college_assignments';
      const attendanceTable = entry.orgType === 'school' ? 'school_attendance_records' : 'college_attendance_records';
      const reportCardTable = entry.orgType === 'school' ? 'school_report_cards' : 'college_report_cards';
      const examTable = entry.orgType === 'school' ? 'school_exams' : 'college_exams';

      const [{ data: homeworkRows }, { data: attendanceRows }, { data: reportCardRows }] = await Promise.all([
        (admin.from(homeworkTable) as any)
          .select('id, title, due_at')
          .eq('organization_id', entry.organizationId)
          .eq('section_id', entry.sectionId)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(10),
        (admin.from(attendanceTable) as any)
          .select('status')
          .eq('organization_id', entry.organizationId)
          .eq('student_id', entry.studentId)
          .gte('attendance_date', thirtyDaysAgo),
        // Only report cards the school/college has actually published — never a draft mark entry.
        (admin.from(reportCardTable) as any)
          .select(`exam_id, total_marks, obtained_marks, percentage, grade, class_position, published_at, ${examTable}(name, term)`)
          .eq('organization_id', entry.organizationId)
          .eq('student_id', entry.studentId)
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(5),
      ]);

      const homework: FamilyHomeworkItem[] = ((homeworkRows || []) as any[]).map((row) => ({
        id: row.id,
        title: row.title,
        due_at: row.due_at,
        overdue: !!row.due_at && row.due_at < now,
      }));
      const overdueCount = homework.filter((item) => item.overdue).length;

      const attendance = ((attendanceRows || []) as any[]).reduce(
        (acc, row) => {
          if (row.status === 'present') acc.presentCount += 1;
          else if (row.status === 'absent') acc.absentCount += 1;
          else if (row.status === 'late') acc.lateCount += 1;
          acc.totalMarked += 1;
          return acc;
        },
        { presentCount: 0, absentCount: 0, lateCount: 0, totalMarked: 0 }
      );

      const examResults: FamilyExamResult[] = ((reportCardRows || []) as any[]).map((row) => {
        const examRaw = row[examTable];
        const exam = Array.isArray(examRaw) ? examRaw[0] : examRaw;
        return {
          examId: row.exam_id,
          examName: exam?.name || 'Exam',
          term: exam?.term || null,
          obtainedMarks: row.obtained_marks,
          totalMarks: row.total_marks,
          percentage: row.percentage,
          grade: row.grade,
          classPosition: row.class_position,
          publishedAt: row.published_at,
        };
      });

      result[entry.studentId] = {
        erpLinked: true,
        orgType: entry.orgType,
        organizationId: entry.organizationId,
        homework: { upcoming: homework, overdueCount },
        examResults,
        attendance: {
          ...attendance,
          percentage: attendance.totalMarked
            ? Math.round(((attendance.presentCount + attendance.lateCount) / attendance.totalMarked) * 100)
            : null,
        },
      };
    })
  );

  return result;
}
