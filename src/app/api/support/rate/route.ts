import { NextResponse } from 'next/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';

export const runtime = 'nodejs';

// Public, read-only — just the live USD/PKR rate so the "Support ilm AI" donate widget can
// convert a PKR amount to the nearest dollar client-side, wherever it's embedded (footer,
// dashboard) without every caller having to thread the rate down from a server component.
export async function GET() {
  let usdToPkr = 280;
  try {
    const settings = await getPlatformSettings();
    if (settings?.exchangeRate?.usdToPkr) usdToPkr = settings.exchangeRate.usdToPkr;
  } catch {
    // Fall back to the default rate.
  }
  return NextResponse.json({ usdToPkr });
}
