import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PrintReportButton } from '@/components/features/school-erp/PrintReportButton';
import { requireCollegeContext } from '@/lib/college-erp/access';

function related(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

// Mirrors src/app/school/report-card/[id]/page.tsx.
export default async function CollegeReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, context } = await requireCollegeContext('exams.read');
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/college/report-card/${id}`)}`);
  if (!context) redirect('/dashboard');

  const { data: report } = await (supabase as any)
    .from('college_report_cards')
    .select('*, college_exams(name, term, starts_on, ends_on), profiles!college_report_cards_student_id_fkey(full_name)')
    .eq('id', id)
    .eq('organization_id', context.organization.id)
    .not('published_at', 'is', null)
    .maybeSingle();
  if (!report) notFound();

  const exam = related(report.college_exams);
  const student = related(report.profiles);
  const subjects = Array.isArray(report.summary?.subjects) ? report.summary.subjects : [];

  return (
    <main className="bg-muted/20 min-h-screen p-4 print:bg-white print:p-0 sm:p-8">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost"><Link href="/college"><ArrowLeft className="mr-2 h-4 w-4" />Portal</Link></Button>
        <PrintReportButton />
      </div>
      <article className="border-border bg-card mx-auto max-w-4xl rounded-lg border p-5 shadow-sm print:border-0 print:shadow-none sm:p-8">
        <header className="border-border border-b pb-5 text-center">
          <h1 className="text-2xl font-bold">{context.organization.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Student report card</p>
        </header>
        <div className="border-border grid gap-3 border-b py-5 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Student:</span> <strong>{student?.full_name || 'Student'}</strong></p>
          <p><span className="text-muted-foreground">Exam:</span> <strong>{exam?.name || 'Exam'}</strong></p>
          <p><span className="text-muted-foreground">Term:</span> <strong>{exam?.term || '-'}</strong></p>
          <p><span className="text-muted-foreground">Published:</span> <strong>{new Date(report.published_at).toLocaleDateString()}</strong></p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead><tr className="bg-muted/60"><th className="border-border border p-2 text-left">Course</th><th className="border-border border p-2 text-right">Maximum</th><th className="border-border border p-2 text-right">Obtained</th></tr></thead>
            <tbody>
              {subjects.map((subject: any, index: number) => (
                <tr key={`${subject.subject}-${index}`}>
                  <td className="border-border border p-2">{subject.subject}</td>
                  <td className="border-border border p-2 text-right">{subject.maxMarks}</td>
                  <td className="border-border border p-2 text-right">{subject.absent ? 'Absent' : subject.marks}</td>
                </tr>
              ))}
              <tr className="font-bold"><td className="border-border border p-2">Total</td><td className="border-border border p-2 text-right">{report.total_marks}</td><td className="border-border border p-2 text-right">{report.obtained_marks}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[['Percentage', `${Number(report.percentage).toFixed(1)}%`], ['Grade', report.grade || '-'], ['GPA', report.gpa ?? '-'], ['Position', report.class_position || '-']].map(([label, value]) => (
            <div key={String(label)} className="border-border rounded-lg border p-3 text-center"><p className="text-muted-foreground text-xs">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>
          ))}
        </div>
        {report.teacher_comment && <div className="bg-muted/40 mt-5 rounded-lg p-4"><p className="text-xs font-semibold">Teacher comment</p><p className="mt-1 text-sm">{report.teacher_comment}</p></div>}
        {report.ai_comment && (
          <div className="bg-muted/40 mt-3 rounded-lg p-4">
            <p className="text-xs font-semibold">Performance summary</p>
            <p className="mt-1 text-sm">{report.ai_comment}</p>
            <p className="text-muted-foreground mt-2 text-[10px]">AI-assisted summary based on this exam&apos;s marks. Reviewed by the college.</p>
          </div>
        )}
      </article>
    </main>
  );
}
