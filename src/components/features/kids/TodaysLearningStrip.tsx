'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';
import { toast } from 'sonner';

interface Step {
  key: string;
  label: string;
  emoji: string;
  href: string;
  done: boolean;
}

/** The homepage "Today's Learning" strip: Mission → English → Maths → Quran → Game → Reward. */
export function TodaysLearningStrip({
  steps,
  rewardDone,
  rewardUnlocked,
}: {
  steps: Step[];
  rewardDone: boolean;
  rewardUnlocked: boolean;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  const claimReward = async () => {
    if (!rewardUnlocked || rewardDone || claiming) return;
    setClaiming(true);
    const result = await logKidsActivity('reward', 'daily_reward', 20);
    setClaiming(false);
    if (result) {
      toast.success('🎉 Daily reward claimed! +20 stars');
      router.refresh();
    }
  };

  const allSteps: (Step & { isReward?: boolean })[] = [
    ...steps,
    { key: 'reward', label: 'Reward', emoji: '🎁', href: '/kids/rewards', done: rewardDone, isReward: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {allSteps.map((step, index) => {
        const content = (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`relative flex flex-col items-center gap-1.5 rounded-[1.5rem] p-3 text-center shadow-lg ${
              step.done
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                : step.isReward && !rewardUnlocked
                  ? 'bg-muted/50'
                  : 'bg-white/85 dark:bg-white/10'
            }`}
          >
            {step.done && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-600 shadow">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <span className="text-3xl">
              {step.isReward && !rewardUnlocked ? <Lock className="text-muted-foreground mx-auto h-7 w-7" /> : step.emoji}
            </span>
            <span className={`text-xs font-black ${step.done ? 'text-white' : 'text-violet-700 dark:text-violet-200'}`}>
              {step.label}
            </span>
          </motion.div>
        );

        if (step.isReward) {
          return (
            <button
              key={step.key}
              type="button"
              disabled={!rewardUnlocked || rewardDone || claiming}
              onClick={claimReward}
              className="disabled:cursor-not-allowed"
            >
              {content}
            </button>
          );
        }
        return (
          <Link key={step.key} href={step.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
