'use client';
import { Flame } from 'lucide-react';
import { useTranslations } from '@/providers/I18nProvider';

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
  return (
    <div className="dashboard-surface border-border/70 text-foreground flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold">
          {timeGreeting}, {name}! 👋
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
