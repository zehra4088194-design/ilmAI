import type { ReportCardData } from './types';

/** Colorful subject "chips" instead of a plain table — leans friendlier/younger-grade. */
export function ModernCard({ data }: { data: ReportCardData }) {
  return (
    <article className="mx-auto max-w-4xl break-after-page overflow-hidden rounded-2xl border border-border shadow-sm print:border-0 print:shadow-none">
      <header className="bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white sm:p-8">
        <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">{data.organizationName}</p>
        <h1 className="mt-1 text-2xl font-bold">{data.studentName}</h1>
        <p className="mt-1 text-sm text-white/80">
          {data.examName}
          {data.examTerm ? ` · ${data.examTerm}` : ''} · Published {new Date(data.publishedAt).toLocaleDateString()}
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <p className="text-2xl font-bold">{Number(data.percentage).toFixed(1)}%</p>
            <p className="text-[11px] text-white/70">Overall</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{data.grade || '-'}</p>
            <p className="text-[11px] text-white/70">Grade</p>
          </div>
          {data.classPosition && (
            <div>
              <p className="text-2xl font-bold">#{data.classPosition}</p>
              <p className="text-[11px] text-white/70">Class position</p>
            </div>
          )}
        </div>
      </header>
      <div className="bg-card grid gap-2 p-5 sm:grid-cols-2 sm:p-8">
        {data.subjects.map((subject, index) => {
          const pct = subject.absent || !subject.maxMarks ? null : ((subject.marks || 0) / subject.maxMarks) * 100;
          return (
            <div key={`${subject.subject}-${index}`} className="border-border flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">{subject.subject}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  subject.absent
                    ? 'bg-muted text-muted-foreground'
                    : pct !== null && pct >= 80
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : pct !== null && pct >= 50
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-rose-500/15 text-rose-600'
                }`}
              >
                {subject.absent ? 'Absent' : `${subject.marks}/${subject.maxMarks}`}
              </span>
            </div>
          );
        })}
      </div>
      {(data.teacherComment || data.aiComment) && (
        <div className="border-border border-t bg-card p-5 sm:p-8">
          {data.teacherComment && <p className="text-sm"><span className="font-semibold">Teacher: </span>{data.teacherComment}</p>}
          {data.aiComment && <p className="text-muted-foreground mt-2 text-sm">{data.aiComment}</p>}
        </div>
      )}
    </article>
  );
}
