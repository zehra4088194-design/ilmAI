import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintReportButton } from '@/components/features/school-erp/PrintReportButton';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getExamTabulation } from '@/lib/school-erp/queries';
import { ResultTabulationTable } from '@/components/features/exams/ResultTabulationTable';
import { cn } from '@/lib/utils/cn';

export default async function SchoolExamTabulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ section?: string; view?: string }>;
}) {
  const { examId } = await params;
  const { section, view } = await searchParams;
  const { supabase, context } = await requireSchoolContext('exams.read', 'exams');
  if (!context) redirect('/school-admin');

  const data = await getExamTabulation(supabase, context, examId);
  if (!data) notFound();

  const activeView = view === 'merit' ? 'merit' : 'sheet';
  const rows = section ? data.rows.filter((row) => row.sectionLabel === section) : data.rows;
  const baseHref = `/school-admin/exams/tabulation/${examId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/school-admin/exams"><ArrowLeft className="mr-2 h-4 w-4" />Exams</Link>
        </Button>
        <PrintReportButton />
      </div>

      <div className="print:hidden">
        <h1 className="text-lg font-bold">{data.exam.name} — result sheet</h1>
        <p className="text-muted-foreground text-sm">
          {rows.length} student{rows.length === 1 ? '' : 's'}. Toggle between the full result sheet (tabulation) and the ranked merit list.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['sheet', 'merit'] as const).map((option) => (
            <Link
              key={option}
              href={`${baseHref}?view=${option}${section ? `&section=${encodeURIComponent(section)}` : ''}`}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition',
                activeView === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {option === 'sheet' ? 'Result Sheet / Tabulation' : 'Merit List'}
            </Link>
          ))}
          <span className="mx-1 text-muted-foreground">·</span>
          <Link
            href={`${baseHref}?view=${activeView}`}
            className={cn('rounded-full px-3 py-1.5 text-xs font-medium', !section ? 'bg-muted' : 'text-muted-foreground hover:bg-muted')}
          >
            All sections
          </Link>
          {data.sections.map((sec) => (
            <Link
              key={sec}
              href={`${baseHref}?view=${activeView}&section=${encodeURIComponent(sec)}`}
              className={cn('rounded-full px-3 py-1.5 text-xs font-medium', section === sec ? 'bg-muted' : 'text-muted-foreground hover:bg-muted')}
            >
              {sec}
            </Link>
          ))}
        </div>
      </div>

      <ResultTabulationTable rows={rows} subjects={data.subjects} view={activeView} />
    </div>
  );
}
