import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { generateReportCardPdf } from '@/lib/school-erp/report-card-pdf';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';

export const runtime = 'nodejs';

async function loadReportCard(db: any, organizationId: string, id: string) {
  const { data } = await db
    .from('school_report_cards')
    .select(
      '*, profiles!school_report_cards_student_id_fkey(full_name, email), school_exams!school_report_cards_exam_id_fkey(name, term)'
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data;
}

async function buildPdf(reportCard: any, organizationName: string) {
  const student = Array.isArray(reportCard.profiles) ? reportCard.profiles[0] : reportCard.profiles;
  const exam = Array.isArray(reportCard.school_exams) ? reportCard.school_exams[0] : reportCard.school_exams;
  const summary = (reportCard.summary || {}) as { subjects?: any[] };
  return generateReportCardPdf({
    organizationName,
    studentName: student?.full_name || 'Student',
    className: null,
    examName: exam?.name || 'Exam',
    term: exam?.term || null,
    totalMarks: Number(reportCard.total_marks || 0),
    obtainedMarks: Number(reportCard.obtained_marks || 0),
    percentage: Number(reportCard.percentage || 0),
    grade: reportCard.grade,
    gpa: reportCard.gpa,
    classPosition: reportCard.class_position,
    teacherComment: reportCard.teacher_comment,
    aiComment: reportCard.ai_comment,
    subjects: summary.subjects || [],
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Term-end report cards are staff-triggered downloads/emails (per spec), not a parent self-serve
  // export — the parent-facing page already shows the same data on-screen without a PDF.
  const { context } = await requireSchoolContext('reports.read', 'reports');
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { createAdminClient } = await import('@/lib/supabase/server');
  const db = (await createAdminClient()) as any;
  const reportCard = await loadReportCard(db, context.organization.id, id);
  if (!reportCard) return NextResponse.json({ error: 'Report card not found.' }, { status: 404 });

  const pdf = await buildPdf(reportCard, context.organization.name);
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${id}.pdf"`,
    },
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // POST = "email this report card to the guardian" — gated by exams.manage (report cards derive
  // from published exam results; there is no separate reports.manage permission in this app).
  const { id } = await params;
  const { context } = await requireSchoolContext('exams.manage', 'reports');
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { createAdminClient } = await import('@/lib/supabase/server');
  const db = (await createAdminClient()) as any;
  const reportCard = await loadReportCard(db, context.organization.id, id);
  if (!reportCard) return NextResponse.json({ error: 'Report card not found.' }, { status: 404 });

  const student = Array.isArray(reportCard.profiles) ? reportCard.profiles[0] : reportCard.profiles;
  const { data: guardianLinks } = await db
    .from('school_guardians')
    .select('guardian_id, profiles!school_guardians_guardian_id_fkey(email)')
    .eq('organization_id', context.organization.id)
    .eq('student_id', reportCard.student_id);
  const guardianEmails = (guardianLinks || [])
    .map((link: any) => (Array.isArray(link.profiles) ? link.profiles[0] : link.profiles)?.email)
    .filter(Boolean);
  const recipientEmail = guardianEmails[0] || student?.email;
  if (!recipientEmail) return NextResponse.json({ error: 'No guardian or student email on file.' }, { status: 400 });
  if (!isEmailConfigured()) return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 });

  const pdf = await buildPdf(reportCard, context.organization.name);
  try {
    await sendEmail({
      to: recipientEmail,
      subject: `Report card — ${student?.full_name || 'Student'}`,
      text: 'Please find the attached report card.',
      html: '<p>Please find the attached report card.</p>',
      attachments: [{ filename: `report-card-${id}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  } catch (error) {
    console.error('Report card email failed:', error);
    return NextResponse.json({ error: 'The report card could not be emailed.' }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', message: `Emailed to ${recipientEmail}` });
}
