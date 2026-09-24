import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Comparison = { subjects: Array<{ id: string; name: string }>; byStudent: Record<string, Record<string, number>> };
type Student = { id: string; full_name?: string };

/**
 * Phase 7c — side-by-side subject strengths/weaknesses across a parent's linked children.
 * Deliberately framed as complementary information (one row per subject, each child's own mastery
 * number) rather than a ranking/leaderboard between siblings — no "winner" styling, no sorting by
 * who's ahead.
 */
export function MultiChildComparison({ comparison, students }: { comparison: Comparison; students: Student[] }) {
  if (!comparison.subjects.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Users className="h-4 w-4 text-violet-500" />
          How your children are each doing
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Subject mastery for each child, shown side by side for your own reference — not a comparison of who&apos;s
          &quot;better,&quot; every child learns at their own pace.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="py-2">Subject</th>
              {students.map((student) => (
                <th key={student.id}>{student.full_name || 'Child'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.subjects.map((subject) => (
              <tr key={subject.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{subject.name}</td>
                {students.map((student) => {
                  const mastery = comparison.byStudent[student.id]?.[subject.id];
                  return (
                    <td key={student.id}>
                      {mastery == null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className={mastery < 50 ? 'text-amber-600' : 'text-emerald-600'}>{mastery}%</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
