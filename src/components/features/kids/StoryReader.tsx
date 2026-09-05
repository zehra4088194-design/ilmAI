'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';

interface StoryPage {
  emoji: string;
  text: string;
}

interface Story {
  id: string;
  title: string;
  cover_emoji: string;
  pages: StoryPage[];
  xp_reward: number;
}

export function StoryReader({ stories }: { stories: Story[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const router = useRouter();
  const active = stories.find((s) => s.id === activeId) || null;

  const openStory = (id: string) => {
    setActiveId(id);
    setPageIndex(0);
    setFinished(false);
  };

  const closeStory = () => {
    setActiveId(null);
    setPageIndex(0);
    setFinished(false);
  };

  const next = async () => {
    if (!active) return;
    if (pageIndex < active.pages.length - 1) {
      setPageIndex((i) => i + 1);
      return;
    }
    if (!finished) {
      setFinished(true);
      const result = await logKidsActivity('stories', active.id, active.xp_reward);
      if (result) router.refresh();
    }
  };

  if (active) {
    const page = active.pages[pageIndex];
    return (
      <div className="mx-auto max-w-md space-y-6">
        <button
          type="button"
          onClick={closeStory}
          className="flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-md dark:bg-white/10 dark:text-violet-200"
        >
          <ArrowLeft className="h-4 w-4" /> All stories
        </button>
        <div className="rounded-[2rem] bg-white/85 p-6 text-center shadow-xl dark:bg-white/5">
          <p className="text-6xl">{page?.emoji}</p>
          <p className="mt-4 text-lg font-semibold text-violet-800 dark:text-violet-100">{page?.text}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-bold">
            Page {pageIndex + 1} / {active.pages.length}
          </p>
          {finished ? (
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <PartyPopper className="h-4 w-4" /> The End! +{active.xp_reward} stars
            </p>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md"
            >
              {pageIndex < active.pages.length - 1 ? 'Next' : 'Finish'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {stories.map((story) => (
        <button
          key={story.id}
          type="button"
          onClick={() => openStory(story.id)}
          className="flex flex-col items-center gap-2 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-center shadow-xl transition active:scale-95"
        >
          <span className="text-4xl">{story.cover_emoji}</span>
          <span className="text-sm font-black text-white">{story.title}</span>
        </button>
      ))}
      {stories.length === 0 && <p className="text-muted-foreground col-span-full text-center text-sm">No stories yet.</p>}
    </div>
  );
}
