'use client';
import { Flame } from 'lucide-react';
import { useTranslations } from '@/providers/I18nProvider';
import { HANDWRITTEN_PALETTE } from '@/lib/constants/handwriting';

// A little "sticky note" beside the greeting, like a teacher's margin comment — purely
// decorative, so the heading itself stays in the normal font and fully legible. Colour and
// message are picked from a hash of the student's name plus today's date: stable all day for a
// given student, but different students (and different days) see a different note.
const STUDY_NOTES = ['Keep going!', "You've got this!", 'One step at a time', 'Small steps, big results', 'Proud of you already'];

function pickStudyNote(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const tone = HANDWRITTEN_PALETTE[Math.abs(hash) % HANDWRITTEN_PALETTE.length]!;
  const message = STUDY_NOTES[Math.abs(hash >> 3) % STUDY_NOTES.length]!;
  const font = hash % 2 === 0 ? 'font-handwritten' : 'font-handwritten-alt';
  return { tone, message, font };
}

export function WelcomeSection({
  name,
  streak,
  institutionName,
}: {
  name: string;
  streak: number;
  institutionName?: string | null;
}) {
  const hour = new Date().getHours();
  const t = useTranslations();
  const timeGreeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');
  const studyNote = pickStudyNote(`${name}-${new Date().toDateString()}`);
  return (
    <div className="dashboard-surface border-border/70 text-foreground flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 shadow-sm">
      <div>
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold">
          {timeGreeting}, {name}! 👋
          <span className={`${studyNote.font} ${studyNote.tone.text} -rotate-3 text-xl font-normal`}>
            {studyNote.message}
          </span>
        </h1>
        {institutionName && <p className="text-primary mt-1 text-sm font-medium">Welcome from {institutionName}</p>}
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-bold text-orange-500">
              {streak} {t('dashboard.dayStreak')}
            </p>
            <p className="text-muted-foreground text-xs">{t('dashboard.keepItUp')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
