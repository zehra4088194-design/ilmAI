import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { RoadmapTimeline } from '@/components/career/RoadmapTimeline';
import { CareerGenerateButton } from '@/components/career/CareerGenerateButton';

export const metadata: Metadata = { title: 'Career Counselor' };

export default async function CareerPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: input }, { data: recs }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user!.id).single(),
    db.from('career_profile_inputs').select('*').eq('student_id', user!.id).maybeSingle(),
    db.from('career_recommendations').select('*').eq('student_id', user!.id).gt('valid_until', new Date().toISOString()).order('generated_at', { ascending: false }).limit(1),
  ]);
  const data = recs?.[0];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-sm font-semibold text-violet-400">AI Career Counselor</p><h1 className="mt-1 text-2xl font-bold">Career recommendations</h1></div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/career/setup">{input ? 'Edit profile' : 'Start setup'}</Link></Button>
          <CareerGenerateButton hasInput={Boolean(input)} hasRecommendations={Boolean(data)} />
        </div>
      </div>
      {profile?.subscription_tier === 'FREE' && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-muted-foreground">
          Free plan mein limited daily preview hai. Pro/Elite se zyada AI generations aur premium tools unlock hotay hain.
        </div>
      )}
      {!data ? (
        <div className="glass rounded-xl p-6"><p className="font-semibold">No recommendations yet</p><p className="text-sm text-muted-foreground">Save your career profile, then generate recommendations from the Career page action/API.</p></div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {(data.recommended_careers || []).map((career: any, index: number) => (
              <div key={index} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{career.title}</p>
                  <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">{career.match_score}%</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{career.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {career.automation_risk && <span className="rounded-full border px-2 py-1">Automation: {career.automation_risk}</span>}
                  {career.avg_salary_pkr && <span className="rounded-full border px-2 py-1">{career.avg_salary_pkr}</span>}
                </div>
              </div>
            ))}
          </section>
          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleList title="Degrees" items={data.recommended_degrees || []} />
            <SimpleList title="Universities" items={data.recommended_universities || []} />
            <SimpleList title="Scholarships" items={data.scholarships || []} />
            <section className="glass rounded-xl p-5">
              <h2 className="mb-3 font-bold">Merit estimation</h2>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(data.merit_estimation || {}, null, 2)}</pre>
              <p className="mt-2 text-xs text-muted-foreground">These are estimates only, not admission guarantees.</p>
            </section>
          </div>
          <section className="glass rounded-xl p-5"><h2 className="mb-4 font-bold">Roadmap</h2><RoadmapTimeline items={data.roadmap || []} /></section>
        </>
      )}
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: any[] }) {
  return (
    <section className="glass rounded-xl p-5">
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="space-y-2">
        {items.length ? items.map((item, index) => (
          <div key={index} className="rounded-lg border p-3 text-sm">
            <p className="font-semibold">{item.title || item.name || item.degree || item.university || item.program || 'Recommendation'}</p>
            {(item.description || item.reason || item.notes) && <p className="mt-1 text-muted-foreground">{item.description || item.reason || item.notes}</p>}
          </div>
        )) : <p className="text-sm text-muted-foreground">No recommendations yet.</p>}
      </div>
    </section>
  );
}
