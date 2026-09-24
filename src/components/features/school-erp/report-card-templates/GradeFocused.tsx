import type { ReportCardData } from './types';

/** Big letter-grade badge front and center, marks table secondary — for schools that grade
 * qualitatively rather than emphasizing raw percentages. */
export function GradeFocused({ data }: { data: ReportCardData }) {
  return (
    <article className="border-border bg-card mx-auto grid max-w-4xl grid-cols-1 gap-6 break-after-page rounded-lg border p-5 shadow-sm print:border-0 print:shadow-none sm:grid-cols-[200px_1fr] sm:p-8">
      <div className="border-border flex flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Overall grade</p>
        <p className="text-6xl font-black text-violet-600">{data.grade || '-'}</p>
        <p className="text-muted-foreground text-sm">{Number(data.percentage).toFixed(1)}%</p>
        {data.classPosition && (
          <p className="border-border mt-2 rounded-full border px-3 py-1 text-xs font-semibold">
            Rank #{data.classPosition}
          </p>
        )}
      </div>
      <div>
        <header className="mb-4">
          <h1 className="text-lg font-bold">{data.studentName}</h1>
          <p className="text-muted-foreground text-sm">
            {data.organizationName} · {data.examName}
            {data.examTerm ? ` (${data.examTerm})` : ''}
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border-border border p-2 text-left">Subject</th>
                <th className="border-border border p-2 text-right">Marks</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject, index) => (
                <tr key={`${subject.subject}-${index}`}>
                  <td className="border-border border p-2">{subject.subject}</td>
                  <td className="border-border border p-2 text-right">
                    {subject.absent ? 'Absent' : `${subject.marks}/${subject.maxMarks}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.teacherComment && (
          <p className="text-muted-foreground mt-4 text-sm">
            <span className="text-foreground font-semibold">Teacher: </span>
            {data.teacherComment}
          </p>
        )}
      </div>
    </article>
  );
}
