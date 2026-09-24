import { createClient } from '@/lib/supabase/server';
import { StoryReader } from '@/components/features/kids/StoryReader';

export const metadata = { title: 'Stories | ilm AI Kids' };

export default async function KidsStoriesPage() {
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from('kids_stories')
    .select('id, title, cover_emoji, pages, xp_reward')
    .order('created_at', { ascending: true });

  const items = (stories || []).map((s) => ({ ...s, pages: s.pages as unknown as { emoji: string; text: string }[] }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Stories 📖</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Tap a story to read it!</p>
      </div>
      <StoryReader stories={items} />
    </div>
  );
}
