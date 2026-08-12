import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintReportButton } from '@/components/features/school-erp/PrintReportButton';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeExamReportCards } from '@/lib/college-erp/queries';
import { REPORT_CARD_TEMPLATES, resolveReportCardTemplate, type ReportCardData } from '@/components/features/school-erp/report-card-templates';

function related(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CollegeExamReportCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { examId } = await params;
  const { template: templateKey } = await searchParams;
  const { supabase, context } = await requireCollegeContext('exams.read', 'exams');
  if (!context) redirect('/college-admin');

  const result = await getCollegeExamReportCards(supabase, context, examId);
  if (!result) notFound();
  const { exam, cards } = result;
  const template = resolveReportCardTemplate(templateKey);
  const { Component } = template;

  const cardData: ReportCardData[] = cards.map((card: any) => {
    const profile = related(card.profiles);
    return {
      organizationName: context.organization.name,
      studentName: profile?.full_name || 'Student',
      examName: exam.name,
      examTerm: exam.term,
      publishedAt: card.published_at,
      subjects: Array.isArray(card.summary?.subjects) ? card.summary.subjects : [],
      totalMarks: Number(card.total_marks || 0),
      obtainedMarks: Number(card.obtained_marks || 0),
      percentage: Number(card.percentage || 0),
      grade: card.grade,
      gpa: card.gpa,
      classPosition: card.class_position,
      teacherComment: card.teacher_comment,
      aiComment: card.ai_comment,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/college-admin/exams"><ArrowLeft className="mr-2 h-4 w-4" />Exams</Link>
        </Button>
        <PrintReportButton />
      </div>
      <div className="print:hidden">
        <h1 className="text-lg font-bold">{exam.name} — report cards</h1>
        <p className="text-muted-foreground text-sm">
          {cardData.length} published report card{cardData.length === 1 ? '' : 's'}. Pick a design, then print or save as PDF.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REPORT_CARD_TEMPLATES.map((option) => (
            <Link
              key={option.key}
              href={`/college-admin/exams/report-cards/${examId}?template=${option.key}`}
              className={`rounded-xl border p-4 text-left transition ${option.key === template.key ? 'border-indigo-500 bg-indigo-500/10' : 'border-border hover:bg-muted'}`}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">{option.description}</p>
            </Link>
          ))}
        </div>
      </div>
      {cardData.length === 0 ? (
        <p className="text-muted-foreground print:hidden">No published report cards for this exam yet — publish results from the Exams page first.</p>
      ) : (
        <div className="space-y-8">
          {cardData.map((data, index) => (<Component key={`${data.studentName}-${index}`} data={data} />))}
        </div>
      )}
    </div>
  );
}
