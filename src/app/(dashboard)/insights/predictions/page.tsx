import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Predictions' };

function supportTone(score: number | null | undefined) {
  const value = Number(score || 0);
  if (value >= 70) return 'Your recent rhythm looks strained. A lighter reset plan may help this week.';
  if (value >= 40) return 'There are a few signals worth watching. A steady plan can pull this back quickly.';
  return 'Your recent learning rhythm looks stable.';
}

export default async function PredictionsPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prediction } = await db
    .from('student_predictions')
    .select('*')
    .eq('student_id', user!.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">Predictive analytics</p>
        <h1 className="mt-1 text-2xl font-bold">Learning forecast</h1>
        <p className="mt-1 text-sm text-muted-foreground">Supportive signals based on study activity, quiz trend, streak, and confidence changes.</p>
      </div>
      {!prediction ? (
        <div className="glass rounded-xl p-6">
          <p className="font-semibold">No forecast yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Forecasts are computed weekly. Keep studying and checking quizzes.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Board marks estimate" value={`${Math.round(prediction.predicted_board_marks || 0)}%`} />
            <Card title="Entry test estimate" value={`${Math.round(prediction.predicted_entry_test_score || 0)}%`} />
          </div>
          <section className="glass rounded-xl p-5">
            <h2 className="font-bold">Study rhythm support</h2>
            <p className="mt-2 text-muted-foreground">{supportTone(prediction.dropout_risk_score)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{prediction.narrative?.student_message}</p>
            <Button asChild variant="gradient" className="mt-4"><Link href="/planner/setup">Adjust my plan</Link></Button>
          </section>
          <section className="glass rounded-xl p-5">
            <h2 className="mb-3 font-bold">Weak chapter risk</h2>
            <div className="space-y-2">
              {(prediction.weak_chapter_risk || []).slice(0, 8).map((item: any) => <p key={item.chapter_id} className="rounded-lg border p-3 text-sm">Chapter {item.chapter_id}: needs focused revision</p>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="glass rounded-xl p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>;
}
