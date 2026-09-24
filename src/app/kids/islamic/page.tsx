import { createClient } from '@/lib/supabase/server';
import { LessonReader } from '@/components/features/kids/LessonReader';

export const metadata = { title: 'Islamic Learning | ilm AI Kids' };

export default async function KidsIslamicPage() {
  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from('kids_islamic_lessons')
    .select('id, title, category, content, emoji, xp_reward')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Islamic Learning 🕌</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Duas, stories, and good values!</p>
      </div>
      <LessonReader lessons={lessons || []} category="islamic" />
    </div>
  );
}
