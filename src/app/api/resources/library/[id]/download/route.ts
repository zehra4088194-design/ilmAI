import { NextResponse } from 'next/server';

// Legacy direct-download endpoint intentionally disabled. Protected resources
// now use POST /api/resources/content and app-only IndexedDB offline storage.
export async function GET() {
  return NextResponse.json(
    { error: 'Direct PDF downloads are disabled. Use the protected reader or in-app Downloads.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
