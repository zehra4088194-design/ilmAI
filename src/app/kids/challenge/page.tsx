import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { McqDeck } from '@/components/features/kids/McqDeck';

export const metadata = { title: "Daily Mini Challenge | ilm AI Kids" };

// Deterministic per-day pick — same challenge all day for this student, a new one
// tomorrow, no extra table needed (reuses kids_quiz_questions + kids_gk_facts).
function hashToIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return length > 0 ? hash % length : 0;
}

export default async function KidsChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids%2Fchallenge');

  const [{ data: quizRows }, { data: gkRows }] = await Promise.all([
    supabase.from('kids_quiz_questions').select('id, question, options, correct_index, emoji, xp_reward'),
    supabase.from('kids_gk_facts').select('id, question, options, correct_index, fun_fact, emoji, xp_reward'),
  ]);

  const pool = [
    ...(quizRows || []).map((row) => ({ ...row, fun_fact: null as string | null })),
    ...(gkRows || []),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const seed = `${today}:${user.id}`;
  const chosen = pool.length ? pool[hashToIndex(seed, pool.length)] : null;

  const items = chosen
    ? [
        {
          id: `${today}-${chosen.id}`,
          question: chosen.question,
          options: chosen.options as string[],
          correctIndex: chosen.correct_index,
          emoji: chosen.emoji,
          xpReward: (chosen.xp_reward || 5) + 5,
          funFact: chosen.fun_fact,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Daily Mini Challenge ⚡</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">
          One special question today — come back tomorrow for a new one!
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No challenge available yet — check back soon!</p>
      ) : (
        <McqDeck items={items} category="challenge" />
      )}
    </div>
  );
}
