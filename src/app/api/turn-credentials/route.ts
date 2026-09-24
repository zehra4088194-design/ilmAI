import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/turn-credentials
 *
 * Fetches dynamic TURN credentials from Metered.ca Open Relay.
 * The 20 GB/month quota applies automatically — no approval needed.
 *
 * Dashboard shows 500 MB only for SFU video; Open Relay is separate.
 */
export async function GET(req: NextRequest) {
  const apiKey = process.env.METERED_SECRET_API_KEY;

  if (!apiKey || apiKey === 'your_secret_api_key_here') {
    return NextResponse.json(
      { error: 'Metered.ca API key not configured' },
      { status: 503 }
    );
  }

  try {
    const appSlug = 'ilmai_study';
    const url = `https://${appSlug}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_channels: 32 }),
      // Cache for 24 hours (credentials are valid for ~24h)
      cache: 'force-cache',
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json(
        { error: `Metered API error: ${res.status}`, details: errorBody },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Normalize response into RTCPeerConnection iceServers format
    const iceServers = (data.uris || []).map((uri: string) => ({
      urls: uri,
      username: data.username,
      credential: data.password,
    }));

    return NextResponse.json({ iceServers, ttl: data.ttl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch TURN credentials' },
      { status: 502 }
    );
  }
}
