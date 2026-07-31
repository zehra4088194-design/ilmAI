import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext } from '@/lib/school-erp/access';

const TYPES = ['attendance', 'fees', 'results', 'admissions'] as const;
type ReportType = (typeof TYPES)[number];

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], records: unknown[][]) {
  return [headers, ...records].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') as ReportType | null;
  if (!type || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid report type.' }, { status: 400 });
  }
  const { supabase, user, context } = await requireSchoolContext('reports.read');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = supabase as any;
  const organizationId = context.organization.id;
  let headers: string[] = [];
  let records: unknown[][] = [];

  if (type === 'attendance') {
    const { data, error } = await db
      .from('school_attendance_records')
      .select('attendance_date, status, remarks, profiles!school_attendance_records_student_id_fkey(full_name), school_sections(name, school_classes(name))')
      .eq('organization_id', organizationId)
      .order('attendance_date', { ascending: false })
      .limit(10_000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    headers = ['Date', 'Student', 'Class', 'Section', 'Status', 'Remarks'];
    records = (data || []).map((item: any) => [
      item.attendance_date,
      relation(item.profiles)?.full_name,
      relation(item.school_sections)?.school_classes?.name,
      relation(item.school_sections)?.name,
      item.status,
      item.remarks,
    ]);
  } else if (type === 'fees') {
    const { data, error } = await db
      .from('school_fee_invoices')
      .select('voucher_number, billing_period, issue_date, due_date, subtotal, discount_amount, scholarship_amount, fine_amount, total_amount, paid_amount, status, profiles!school_fee_invoices_student_id_fkey(full_name)')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: false })
      .limit(10_000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    headers = ['Voucher', 'Student', 'Period', 'Issue date', 'Due date', 'Subtotal', 'Discount', 'Scholarship', 'Fine', 'Total', 'Paid', 'Balance', 'Status'];
    records = (data || []).map((item: any) => [
      item.voucher_number,
      relation(item.profiles)?.full_name,
      item.billing_period,
      item.issue_date,
      item.due_date,
      item.subtotal,
      item.discount_amount,
      item.scholarship_amount,
      item.fine_amount,
      item.total_amount,
      item.paid_amount,
      Math.max(0, Number(item.total_amount) - Number(item.paid_amount)),
      item.status,
    ]);
  } else if (type === 'results') {
    const { data, error } = await db
      .from('school_report_cards')
      .select('total_marks, obtained_marks, percentage, gpa, grade, class_position, published_at, profiles!school_report_cards_student_id_fkey(full_name), school_exams(name, term)')
      .eq('organization_id', organizationId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(10_000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    headers = ['Exam', 'Term', 'Student', 'Total', 'Obtained', 'Percentage', 'GPA', 'Grade', 'Position', 'Published'];
    records = (data || []).map((item: any) => [
      relation(item.school_exams)?.name,
      relation(item.school_exams)?.term,
      relation(item.profiles)?.full_name,
      item.total_marks,
      item.obtained_marks,
      item.percentage,
      item.gpa,
      item.grade,
      item.class_position,
      item.published_at,
    ]);
  } else {
    const { data, error } = await db
      .from('school_admissions')
      .select('application_number, applicant_name, date_of_birth, gender, applying_for_class, guardian_name, guardian_email, guardian_phone, previous_school, status, submitted_at')
      .eq('organization_id', organizationId)
      .order('submitted_at', { ascending: false })
      .limit(10_000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    headers = ['Application', 'Applicant', 'Date of birth', 'Gender', 'Class', 'Guardian', 'Email', 'Phone', 'Previous school', 'Status', 'Submitted'];
    records = (data || []).map((item: any) => [
      item.application_number,
      item.applicant_name,
      item.date_of_birth,
      item.gender,
      item.applying_for_class,
      item.guardian_name,
      item.guardian_email,
      item.guardian_phone,
      item.previous_school,
      item.status,
      item.submitted_at,
    ]);
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${toCsv(headers, records)}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-${date}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
