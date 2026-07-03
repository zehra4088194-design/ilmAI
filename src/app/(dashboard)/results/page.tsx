import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/format';
export const metadata: Metadata = { title: 'Results' };

export default async function ResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sessions } = await supabase.from('quiz_sessions').select('*').eq('user_id', user!.id).eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(20);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Quiz Results</h1><p className="text-muted-foreground">Apni quiz history dekho</p></div>
      <div className="space-y-3">
        {(sessions || []).map((session) => (
          <Card key={session.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{session.mode} Quiz</p>
                <p className="text-xs text-muted-foreground">{session.completed_at && formatRelativeTime(session.completed_at)} · {session.correct_count}/{session.questions?.length || 0} correct</p>
              </div>
              <Badge variant={(session.score ?? 0) >= 70 ? 'success' : (session.score ?? 0) >= 50 ? 'warning' : 'destructive'}>{session.score ?? 0}%</Badge>
            </CardContent>
          </Card>
        ))}
        {(!sessions || sessions.length === 0) && <div className="text-center py-12 text-muted-foreground">Koi quiz results nahi hain abhi. Practice shuru karo!</div>}
      </div>
    </div>
  );
}