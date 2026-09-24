'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpenText, Check, Clock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { QuranCallRoom } from '@/components/features/quran/QuranCallRoom';
import type { QuranStudentGroup } from '@/lib/quran/access';
import type { QuranAttendanceSummary } from '@/lib/quran/attendance-summary';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayDow(): number {
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

function classStatus(group: QuranStudentGroup, attendedToday: boolean): { label: string; tone: 'green' | 'amber' | 'muted' } {
  if (attendedToday) return { label: "You joined today's class! ✅", tone: 'green' };
  if (!group.days_of_week.includes(todayDow())) {
    const nextDay = group.days_of_week[0];
    return { label: `No class today. Next class: ${nextDay ? DAY_LABELS[nextDay - 1] : '—'}`, tone: 'muted' };
  }
  const [hourStr, minuteStr] = (group.session_time || '00:00').split(':');
  const sessionMinutes = Number(hourStr) * 60 + Number(minuteStr || 0);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < sessionMinutes) {
    return { label: `Class starts today at ${group.session_time}`, tone: 'amber' };
  }
  if (nowMinutes <= sessionMinutes + 60) {
    return { label: "Class time! Tap Join to enter now.", tone: 'green' };
  }
  return { label: "Today's class time has passed.", tone: 'muted' };
}

export function KidsQuranView({
  groups,
  attendance,
  practiceDoneToday,
}: {
  groups: QuranStudentGroup[];
  attendance: QuranAttendanceSummary;
  practiceDoneToday: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState<QuranStudentGroup | null>(null);
  const [practiceDone, setPracticeDone] = useState(practiceDoneToday);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const markPractice = async () => {
    if (practiceDone || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/quran/practice', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not save your practice.');
        return;
      }
      setPracticeDone(true);
      toast.success('Great job reading today! +10 stars');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (activeGroup) {
    return <QuranCallRoom groupId={activeGroup.id} groupName={activeGroup.name} role="student" onLeave={() => setActiveGroup(null)} />;
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-violet-700 dark:text-violet-200">
          <BookOpenText className="h-6 w-6 text-emerald-500" /> Quran Class 📗
        </h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">
          Your daily morning recitation class.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[2rem] bg-white/80 p-6 text-center shadow-xl dark:bg-white/5">
          <p className="text-4xl">📗</p>
          <p className="mt-2 text-sm font-semibold">No Quran class yet</p>
          <p className="text-muted-foreground mt-1 text-xs">Ask your parent to add you to a Quran group.</p>
        </div>
      ) : (
        groups.map((group) => {
          const status = classStatus(group, attendance.attendedToday);
          return (
            <div key={group.id} className="space-y-4 rounded-[2rem] bg-white/85 p-5 shadow-xl dark:bg-white/5">
              <div>
                <p className="text-lg font-black text-violet-700 dark:text-violet-200">{group.name}</p>
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  {group.session_time} · {group.days_of_week.map((d) => DAY_LABELS[d - 1]).join(', ')} · with {group.teacher_name}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-3">
                <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">Today's Lesson</p>
                <p className="text-sm font-semibold">{group.current_lesson || 'Your teacher hasn\'t set today\'s lesson yet.'}</p>
              </div>

              <div
                className={`rounded-2xl p-3 text-sm font-bold ${
                  status.tone === 'green'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : status.tone === 'amber'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {status.label}
              </div>

              <button
                type="button"
                disabled={group.status !== 'active'}
                onClick={() => setActiveGroup(group)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
              >
                <Phone className="h-4 w-4" /> Join Class
              </button>
            </div>
          );
        })
      )}

      <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl dark:bg-white/5">
        <p className="text-sm font-black text-violet-700 dark:text-violet-200">Reading &amp; Practice</p>
        <p className="text-muted-foreground mt-1 text-xs">Did you read/practice your Quran lesson today?</p>
        <button
          type="button"
          onClick={markPractice}
          disabled={practiceDone || saving}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black text-white shadow-md disabled:opacity-70 ${
            practiceDone ? 'bg-emerald-500' : 'bg-violet-600'
          }`}
        >
          <Check className="h-4 w-4" /> {practiceDone ? 'Done for today!' : 'I practiced today!'}
        </button>
      </div>

      <div className="rounded-[2rem] bg-white/85 p-5 shadow-xl dark:bg-white/5">
        <p className="text-sm font-black text-violet-700 dark:text-violet-200">Attendance</p>
        <p className="mt-1 text-3xl font-black text-emerald-600">{attendance.thisMonthCount}</p>
        <p className="text-muted-foreground text-xs">classes attended this month</p>
      </div>
    </div>
  );
}
