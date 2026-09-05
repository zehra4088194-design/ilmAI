'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';

export function MissionCheckIn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startMission = async () => {
    setLoading(true);
    const result = await logKidsActivity('mission', 'daily_checkin', 5);
    setLoading(false);
    if (result) router.refresh();
  };

  return (
    <button
      type="button"
      onClick={startMission}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-br from-rose-400 to-orange-500 py-4 text-lg font-black text-white shadow-xl transition active:scale-95 disabled:opacity-70"
    >
      <Rocket className="h-5 w-5" /> Start today&apos;s mission! +5 stars
    </button>
  );
}
