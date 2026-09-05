import { createClient } from '@/lib/supabase/server';
import { McqDeck } from '@/components/features/kids/McqDeck';

export const metadata = { title: 'General Knowledge | ilm AI Kids' };

export default async function KidsGkPage() {
  const supabase = await createClient();
  const { data: facts } = await supabase
    .from('kids_gk_facts')
    .select('id, question, options, correct_index, fun_fact, emoji, xp_reward')
    .order('created_at', { ascending: true });

  const items = (facts || []).map((row) => ({
    id: row.id,
    question: row.question,
    options: row.options as string[],
    correctIndex: row.correct_index,
    emoji: row.emoji,
    xpReward: row.xp_reward,
    funFact: row.fun_fact,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">General Knowledge 🌍</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Fun facts about our world!</p>
      </div>
      <McqDeck items={items} category="gk" />
    </div>
  );
}
