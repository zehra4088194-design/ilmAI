'use client';

// Thin client-side wrapper around POST /api/kids/activity — call this from any kids
// section on a win/completion so it (a) logs a kids_activity_log row for the "Today's
// Learning" checklist and (b) awards real XP via the existing gamification pipeline
// (src/lib/gamification/xp.ts::awardXp), instead of the old kids-zone games which
// tracked score only in local state.
export async function logKidsActivity(
  category: string,
  activityKey: string,
  xp: number
): Promise<{ xp: number; level: number; streak: number } | null> {
  try {
    const res = await fetch('/api/kids/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, activityKey, xp }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
