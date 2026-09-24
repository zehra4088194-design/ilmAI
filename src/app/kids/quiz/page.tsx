import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { McqDeck } from '@/components/features/kids/McqDeck';

export const metadata = { title: 'Interactive Quizzes | ilm AI Kids' };

const SUBJECTS = [
  { key: 'all', label: 'All', emoji: '❓' },
  { key: 'english', label: 'English', emoji: '🔤' },
  { key: 'maths', label: 'Maths', emoji: '🔢' },
  { key: 'urdu', label: 'Urdu', emoji: '🪄' },
  { key: 'gk', label: 'GK', emoji: '🌍' },
  { key: 'islamic', label: 'Islamic', emoji: '🕌' },
];

export default async function KidsQuizPage({ searchParams }: { searchParams?: Promise<{ subject?: string }> }) {
  const params = await searchParams;
  const subject = params?.subject && SUBJECTS.some((s) => s.key === params.subject) ? params.subject : 'all';

  const supabase = await createClient();
  let query = supabase
    .from('kids_quiz_questions')
    .select('id, subject, question, options, correct_index, emoji, xp_reward')
    .order('created_at', { ascending: true });
  if (subject !== 'all') query = query.eq('subject', subject);
  const { data: questions } = await query;

  const items = (questions || []).map((row) => ({
    id: row.id,
    question: row.question,
    options: row.options as string[],
    correctIndex: row.correct_index,
    emoji: row.emoji,
    xpReward: row.xp_reward,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Interactive Quizzes ❓</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Pick a subject and test yourself!</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <Link
            key={s.key}
            href={s.key === 'all' ? '/kids/quiz' : `/kids/quiz?subject=${s.key}`}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition ${
              subject === s.key ? 'bg-violet-600 text-white shadow-md' : 'bg-white/70 text-violet-700/80 dark:bg-white/10 dark:text-violet-200/80'
            }`}
          >
            <span>{s.emoji}</span> {s.label}
          </Link>
        ))}
      </div>
      <McqDeck key={subject} items={items} category="quiz" />
    </div>
  );
}
