import type { ReportCardData } from './types';

/** The original single-template design (from src/app/school/report-card/[id]/page.tsx), now one
 * of several selectable templates rather than the only option. */
export function ClassicTable({ data }: { data: ReportCardData }) {
  return (
    <article className="border-border bg-card mx-auto max-w-4xl rounded-lg border p-5 shadow-sm break-after-page print:border-0 print:shadow-none sm:p-8">
      <header className="border-border border-b pb-5 text-center">
        <h1 className="text-2xl font-bold">{data.organizationName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Student report card</p>
      </header>
      <div className="border-border grid gap-3 border-b py-5 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Student:</span> <strong>{data.studentName}</strong></p>
        <p><span className="text-muted-foreground">Exam:</span> <strong>{data.examName}</strong></p>
        <p><span className="text-muted-foreground">Term:</span> <strong>{data.examTerm || '-'}</strong></p>
        <p><span className="text-muted-foreground">Published:</span> <strong>{new Date(data.publishedAt).toLocaleDateString()}</strong></p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead><tr className="bg-muted/60"><th className="border-border border p-2 text-left">Subject</th><th className="border-border border p-2 text-right">Maximum</th><th className="border-border border p-2 text-right">Obtained</th></tr></thead>
          <tbody>
            {data.subjects.map((subject, index) => (
              <tr key={`${subject.subject}-${index}`}>
                <td className="border-border border p-2">{subject.subject}</td>
                <td className="border-border border p-2 text-right">{subject.maxMarks}</td>
                <td className="border-border border p-2 text-right">{subject.absent ? 'Absent' : subject.marks}</td>
              </tr>
            ))}
            <tr className="font-bold"><td className="border-border border p-2">Total</td><td className="border-border border p-2 text-right">{data.totalMarks}</td><td className="border-border border p-2 text-right">{data.obtainedMarks}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[['Percentage', `${Number(data.percentage).toFixed(1)}%`], ['Grade', data.grade || '-'], ['GPA', data.gpa ?? '-'], ['Position', data.classPosition || '-']].map(([label, value]) => (
          <div key={String(label)} className="border-border rounded-lg border p-3 text-center"><p className="text-muted-foreground text-xs">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>
        ))}
      </div>
      {data.teacherComment && <div className="bg-muted/40 mt-5 rounded-lg p-4"><p className="text-xs font-semibold">Teacher comment</p><p className="mt-1 text-sm">{data.teacherComment}</p></div>}
      {data.aiComment && (
        <div className="bg-muted/40 mt-3 rounded-lg p-4">
          <p className="text-xs font-semibold">Performance summary</p>
          <p className="mt-1 text-sm">{data.aiComment}</p>
        </div>
      )}
    </article>
  );
}
