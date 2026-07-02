import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export async function SubjectHeatmap({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('id, name, color').limit(5);
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Subject Performance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(subjects || []).map((subject, i) => {
          const score = [85, 72, 90, 65, 78][i] || 70;
          return (
            <div key={subject.id}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{subject.name}</span>
                <span className="text-muted-foreground">{score}%</span>
              </div>
              <Progress value={score} indicatorClassName="bg-current" style={{ color: subject.color }} />
            </div>
          );
        })}
        {(!subjects || subjects.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Subjects jald hi add honge</p>}
      </CardContent>
    </Card>
  );
}
