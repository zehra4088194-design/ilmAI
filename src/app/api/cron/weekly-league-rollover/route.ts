import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { LEAGUE_TIERS, type LeagueTier } from '@/lib/gamification/constants';

export const runtime = 'nodejs';

function weekStart(offsetWeeks = 0) {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1 + offsetWeeks * 7);
  return date.toISOString().slice(0, 10);
}

function moveTier(tier: LeagueTier, direction: -1 | 0 | 1) {
  const index = LEAGUE_TIERS.indexOf(tier);
  return LEAGUE_TIERS[Math.min(LEAGUE_TIERS.length - 1, Math.max(0, index + direction))] ?? 'bronze';
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient() as any;
    const closedWeek = weekStart(-1);
    const nextWeek = weekStart(0);
    const { data: rows, error } = await supabase
      .from('league_memberships')
      .select('user_id, tier, weekly_xp')
      .eq('week_start_date', closedWeek)
      .order('weekly_xp', { ascending: false });

    if (error) throw error;
    if (!rows?.length) return NextResponse.json({ status: 'success', processed: 0 });

    const byTier = new Map<LeagueTier, any[]>();
    for (const row of rows) {
      const tier = row.tier as LeagueTier;
      byTier.set(tier, [...(byTier.get(tier) || []), row]);
    }

    const nextRows: { user_id: string; tier: LeagueTier; week_start_date: string; weekly_xp: number }[] = [];
    for (const [tier, members] of byTier.entries()) {
      const zone = Math.max(1, Math.ceil(members.length * 0.1));
      members.forEach((member, index) => {
        const direction = index < zone ? 1 : index >= members.length - zone ? -1 : 0;
        nextRows.push({
          user_id: member.user_id,
          tier: moveTier(tier, direction),
          week_start_date: nextWeek,
          weekly_xp: 0,
        });
      });
    }

    await supabase.from('league_memberships').upsert(nextRows, { onConflict: 'user_id,week_start_date' });
    return NextResponse.json({ status: 'success', processed: nextRows.length });
  } catch (error) {
    console.error('League rollover error:', error);
    return NextResponse.json({ status: 'error', error: 'League rollover failed' }, { status: 500 });
  }
}
