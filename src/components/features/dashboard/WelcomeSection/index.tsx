'use client';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useTranslations } from '@/providers/I18nProvider';

export function WelcomeSection({ name, streak }: { name: string; streak: number }) {
  const hour = new Date().getHours();
  const t = useTranslations();
  const timeGreeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening');
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 border border-border/50 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold">{timeGreeting}, {name}! 👋</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/20">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-bold text-orange-500">{streak} {t('dashboard.dayStreak')}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.keepItUp')}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
