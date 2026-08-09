import { NextRequest, NextResponse } from 'next/server';
import { getPlatformSettings, savePlatformSettings } from '@/lib/platform-settings/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ExchangeRateResponse = {
  result?: string;
  conversion_rate?: number;
  base_code?: string;
  target_code?: string;
  time_last_update_utc?: string;
  'error-type'?: string;
};

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ status: 'error', error: 'EXCHANGE_RATE_API_KEY is not configured.' }, { status: 503 });
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/PKR`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
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
    console.error('USD/PKR rate cron failed:', error);
    const settings = await getPlatformSettings();
    return NextResponse.json(
      {
        status: 'fallback',
        error: error instanceof Error ? error.message : 'Could not fetch USD/PKR rate.',
        rate: settings.exchangeRate.usdToPkr,
        fetchedAt: settings.exchangeRate.fetchedAt,
      },
      { status: 502 }
    );
  }
}
