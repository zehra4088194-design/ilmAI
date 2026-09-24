'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';

interface Lesson {
  id: string;
  title: string;
  category: string;
  content: string;
  emoji: string;
  xp_reward: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  dua: 'Duas 🤲',
  prophet_story: 'Prophet Stories 🕋',
  value: 'Good Values 🌟',
};

export function LessonReader({ lessons, category }: { lessons: Lesson[]; category: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const router = useRouter();
  const active = lessons.find((l) => l.id === activeId) || null;

  const markRead = async () => {
    if (!active || done.has(active.id)) return;
    setDone((prev) => new Set(prev).add(active.id));
    const result = await logKidsActivity(category, active.id, active.xp_reward);
    if (result) router.refresh();
  };

  if (active) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <button
          type="button"
          onClick={() => setActiveId(null)}
          className="flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-md dark:bg-white/10 dark:text-violet-200"
        >
          <ArrowLeft className="h-4 w-4" /> All lessons
        </button>
        <div className="rounded-[2rem] bg-white/85 p-6 text-center shadow-xl dark:bg-white/5">
          <p className="text-6xl">{active.emoji}</p>
          <p className="mt-3 text-lg font-black text-violet-700 dark:text-violet-200">{active.title}</p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{active.content}</p>
        </div>
        <button
          type="button"
          onClick={markRead}
          disabled={done.has(active.id)}
          className="mx-auto flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {done.has(active.id) ? `Read! +${active.xp_reward} stars` : "I read it!"}
        </button>
      </div>
    );
  }

  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    (acc[lesson.category] ||= []).push(lesson);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="mb-2 text-sm font-black text-violet-600 dark:text-violet-300">{CATEGORY_LABELS[cat] || cat}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveId(lesson.id)}
                className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-center shadow-lg transition active:scale-95"
              >
                <span className="text-3xl">{lesson.emoji}</span>
                <span className="text-xs font-black text-white">{lesson.title}</span>
                {done.has(lesson.id) && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      {lessons.length === 0 && <p className="text-muted-foreground text-sm">No lessons yet.</p>}
    </div>
  );
}
