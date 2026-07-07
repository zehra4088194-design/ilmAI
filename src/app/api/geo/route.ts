import { NextRequest, NextResponse } from 'next/server';

// Cheap, dependency-free country detection for the signup form's board
// default (Pakistan vs India). Vercel automatically sets x-vercel-ip-country
// on every request in production — no external API call needed there.
// Falls back to 'PK' locally / on other hosts where that header is absent.
export async function GET(req: NextRequest) {
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') || // if ever proxied through Cloudflare
    'PK';

  return NextResponse.json({ country: country.toUpperCase() });
}
