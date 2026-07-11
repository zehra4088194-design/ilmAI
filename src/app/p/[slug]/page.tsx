import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const db = supabase as any;
  const { data: settings } = await db
    .from('portfolio_settings')
    .select('student_id, headline, bio, public_slug')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .maybeSingle();
  if (!settings) notFound();
  const [{ data: profile }, { data: achievements }] = await Promise.all([
    supabase.from('profiles').select('full_name, xp, level, streak, board, grade_level').eq('id', settings.student_id).single(),
    supabase.from('user_achievements').select('achievements(name, icon_url)').eq('user_id', settings.student_id).limit(8),
  ]);
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="glass rounded-xl p-6">
          <p className="text-sm font-semibold text-violet-400">ilm AI Portfolio</p>
          <h1 className="mt-2 text-3xl font-bold">{profile?.full_name || 'Student'}</h1>
          <p className="mt-2 text-xl">{settings.headline}</p>
          <p className="mt-3 text-muted-foreground">{settings.bio}</p>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Level" value={profile?.level || 1} />
          <Stat label="XP" value={profile?.xp || 0} />
          <Stat label="Streak" value={profile?.streak || 0} />
        </div>
        <section className="glass rounded-xl p-6">
          <h2 className="mb-4 font-bold">Achievements</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(achievements || []).map((row: any, index) => <div key={index} className="rounded-lg border p-3">{row.achievements?.icon_url} {row.achievements?.name}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}
