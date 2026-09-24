import type { ReportCardData } from './types';

/** GPA as the headline metric with a per-subject GPA-style bar chart — for colleges/senior grades
 * that report on a GPA scale rather than raw percentages. */
export function GpaFocused({ data }: { data: ReportCardData }) {
  return (
    <article className="border-border bg-card mx-auto max-w-4xl break-after-page rounded-lg border p-5 shadow-sm print:border-0 print:shadow-none sm:p-8">
      <header className="border-border flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{data.organizationName}</p>
          <h1 className="mt-1 text-xl font-bold">{data.studentName}</h1>
          <p className="text-muted-foreground text-sm">
            {data.examName}
            {data.examTerm ? ` · ${data.examTerm}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-indigo-600">{data.gpa != null ? Number(data.gpa).toFixed(2) : '-'}</p>
          <p className="text-muted-foreground text-xs">GPA</p>
        </div>
      </header>
      <div className="mt-5 space-y-2.5">
        {data.subjects.map((subject, index) => {
          const pct = subject.absent || !subject.maxMarks ? 0 : Math.round(((subject.marks || 0) / subject.maxMarks) * 100);
          return (
            <div key={`${subject.subject}-${index}`}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{subject.subject}</span>
                <span className="text-muted-foreground">{subject.absent ? 'Absent' : `${subject.marks}/${subject.maxMarks}`}</span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="border-border rounded-lg border p-3"><p className="text-muted-foreground text-xs">Percentage</p><p className="mt-1 text-lg font-bold">{Number(data.percentage).toFixed(1)}%</p></div>
        <div className="border-border rounded-lg border p-3"><p className="text-muted-foreground text-xs">Grade</p><p className="mt-1 text-lg font-bold">{data.grade || '-'}</p></div>
        <div className="border-border rounded-lg border p-3"><p className="text-muted-foreground text-xs">Position</p><p className="mt-1 text-lg font-bold">{data.classPosition || '-'}</p></div>
      </div>
      {data.teacherComment && <p className="text-muted-foreground mt-4 text-sm">{data.teacherComment}</p>}
    </article>
  );
}
