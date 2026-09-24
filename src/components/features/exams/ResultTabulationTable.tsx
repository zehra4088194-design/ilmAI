export type TabulationRow = {
  studentId: string;
  studentName: string;
  rollNumber: string;
  sectionLabel: string;
  marksBySubject: Map<string, { subject: string; maxMarks: number; marks: number | null; absent: boolean }>;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string | null;
  gpa: number | null;
  classPosition: number | null;
};

// One wide subject-by-subject table drives all three competitor views: "Result Sheet" (register
// order), "Tabulation" (the same wide sheet — that's what a tabulation register is), and "Merit
// List" (the same rows re-sorted by rank). No separate rendering per view.
export function ResultTabulationTable({ rows, subjects, view }: { rows: TabulationRow[]; subjects: string[]; view: 'sheet' | 'merit' }) {
  const sorted = [...rows].sort((a, b) => {
    if (view === 'merit') {
      if (a.classPosition != null && b.classPosition != null) return a.classPosition - b.classPosition;
      return b.percentage - a.percentage;
    }
    const rollA = Number(a.rollNumber);
    const rollB = Number(b.rollNumber);
    if (Number.isFinite(rollA) && Number.isFinite(rollB)) return rollA - rollB;
    return a.rollNumber.localeCompare(b.rollNumber);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            {view === 'merit' && <th className="py-2 pr-2">Rank</th>}
            <th className="pr-2">Roll</th>
            <th className="pr-2">Student</th>
            <th className="pr-2">Section</th>
            {view === 'sheet' &&
              subjects.map((subject) => (
                <th key={subject} className="pr-2 text-right">{subject}</th>
              ))}
            <th className="pr-2 text-right">Total</th>
            <th className="pr-2 text-right">%</th>
            <th className="pr-2">Grade</th>
            {view === 'sheet' && <th className="pr-2">GPA</th>}
            {view === 'sheet' && <th className="text-right">Position</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr key={row.studentId} className="border-b last:border-0">
              {view === 'merit' && <td className="py-2 pr-2 font-bold">{row.classPosition ?? index + 1}</td>}
              <td className="py-2 pr-2">{row.rollNumber}</td>
              <td className="pr-2 font-medium">{row.studentName}</td>
              <td className="text-muted-foreground pr-2 text-xs">{row.sectionLabel}</td>
              {view === 'sheet' &&
                subjects.map((subject) => {
                  const mark = row.marksBySubject.get(subject);
                  return (
                    <td key={subject} className="pr-2 text-right">
                      {!mark ? '—' : mark.absent ? <span className="text-destructive">Abs</span> : `${mark.marks}/${mark.maxMarks}`}
                    </td>
                  );
                })}
              <td className="pr-2 text-right">{row.obtainedMarks}/{row.totalMarks}</td>
              <td className="pr-2 text-right font-semibold">{row.percentage.toFixed(1)}%</td>
              <td className="pr-2">{row.grade || '—'}</td>
              {view === 'sheet' && <td className="pr-2">{row.gpa ?? '—'}</td>}
              {view === 'sheet' && <td className="text-right">{row.classPosition ?? '—'}</td>}
            </tr>
          ))}
          {!sorted.length && (
            <tr>
              <td colSpan={20} className="text-muted-foreground py-6 text-center">No published results for this exam.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
