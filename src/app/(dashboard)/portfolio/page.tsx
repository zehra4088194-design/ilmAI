import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Portfolio' };

export default async function PortfolioPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: settings }, { data: achievements }, { data: league }, { data: twin }] = await Promise.all([
    supabase.from('profiles').select('full_name, xp, level, streak, board, grade_level').eq('id', user!.id).single(),
    db.from('portfolio_settings').select('*').eq('student_id', user!.id).maybeSingle(),
    supabase.from('user_achievements').select('achievements(name, icon_url)').eq('user_id', user!.id).limit(8),
    db.from('league_memberships').select('tier').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1),
    db.from('student_digital_twin').select('strengths, confidence_level').eq('student_id', user!.id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-400">Student Portfolio</p>
          <h1 className="mt-1 text-2xl font-bold">{profile?.full_name || 'Student'}</h1>
        </div>
        <Button asChild variant="outline"><Link href="/portfolio/edit">Edit</Link></Button>
      </div>
      <section className="glass rounded-xl p-6">
        <h2 className="text-xl font-bold">{settings?.headline || 'Learning profile'}</h2>
        <p className="mt-2 text-muted-foreground">{settings?.bio || 'Add a short bio to make this portfolio shine.'}</p>
        {settings?.is_public && settings.public_slug ? <p className="mt-3 text-sm text-violet-400">Public: /p/{settings.public_slug}</p> : null}
      </section>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="XP" value={profile?.xp || 0} />
        <Stat label="Level" value={profile?.level || 1} />
        <Stat label="Streak" value={profile?.streak || 0} />
        <Stat label="League" value={(league as any)?.[0]?.tier || 'bronze'} />
      </div>
      <section className="glass rounded-xl p-6">
        <h2 className="mb-4 font-bold">Achievements</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(achievements || []).map((row: any, index) => <div key={index} className="rounded-lg border p-3">{row.achievements?.icon_url} {row.achievements?.name}</div>)}
        </div>
      </section>
      <section className="glass rounded-xl p-6">
        <h2 className="mb-4 font-bold">Strengths</h2>
        <div className="space-y-2 text-sm">
          {Object.entries(((twin as any)?.strengths || {}) as Record<string, number>).slice(0, 6).map(([key, value]) => <p key={key}>{key}: <span className="font-semibold">{value}%</span></p>)}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold capitalize">{value}</p></div>;
}
