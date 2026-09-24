import { NextRequest, NextResponse } from 'next/server';

// A CDN/reverse proxy may provide a country header. Pakistan remains the
// product default when the Oracle origin receives no geolocation metadata.
export async function GET(req: NextRequest) {
  const country = req.headers.get('cf-ipcountry') || req.headers.get('x-country-code') || 'PK';
  return NextResponse.json({ country: country.toUpperCase() });
}
