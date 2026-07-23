import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export async function SubjectHeatmap({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', userId).single();
  let subjectsQuery = supabase.from('subjects').select('id, name, color').eq('is_active', true).limit(5);
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('subject_id, score')
    .eq('user_id', userId)
    .eq('status', 'COMPLETED')
    .not('score', 'is', null);

  const scoresBySubject = new Map<string, number[]>();
  for (const s of sessions || []) {
    if (!s.subject_id || s.score === null) continue;
    const arr = scoresBySubject.get(s.subject_id) || [];
    arr.push(Number(s.score));
    scoresBySubject.set(s.subject_id, arr);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Subject Performance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {(subjects || []).map((subject) => {
          const scores = scoresBySubject.get(subject.id);
          const hasData = !!scores && scores.length > 0;
          const avg = hasData ? Math.round(scores!.reduce((a, b) => a + b, 0) / scores!.length) : 0;
          return (
            <div key={subject.id}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{subject.name}</span>
                <span className="text-muted-foreground">{hasData ? `${avg}%` : 'No quizzes yet'}</span>
              </div>
              <Progress value={avg} indicatorClassName="bg-current" style={{ color: subject.color }} />
            </div>
          );
        })}
        {(!subjects || subjects.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Subjects jald hi add honge</p>}
      </CardContent>
    </Card>
  );
}
