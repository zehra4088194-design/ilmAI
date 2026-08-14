import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings, savePlatformSettings } from '@/lib/platform-settings/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type ExchangeRateResponse = {
  result?: string;
  conversion_rate?: number;
  time_last_update_utc?: string;
  'error-type'?: string;
};

// Manual trigger for the same USD->PKR refresh the twice-daily cron does —
// lets an admin force an update from the settings panel instead of waiting
// for the next scheduled run.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'EXCHANGE_RATE_API_KEY is not configured.' }, { status: 503 });
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/PKR`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as ExchangeRateResponse;
    if (data.result !== 'success' || !Number.isFinite(Number(data.conversion_rate))) {
      throw new Error(data['error-type'] || 'Exchange rate API returned an invalid response.');
    }

    const settings = await getPlatformSettings();
    const saved = await savePlatformSettings({
      ...settings,
      exchangeRate: {
        usdToPkr: Number(data.conversion_rate),
        base: 'USD',
        target: 'PKR',
        lastUpdated: data.time_last_update_utc || null,
        fetchedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      status: 'success',
      rate: saved.exchangeRate.usdToPkr,
      fetchedAt: saved.exchangeRate.fetchedAt,
      lastUpdated: saved.exchangeRate.lastUpdated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not fetch USD/PKR rate.' },
      { status: 502 }
    );
  }
}
