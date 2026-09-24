import { NextResponse } from 'next/server';
import { isR2Configured, getR2Uri, parseR2Uri } from '@/lib/storage/r2';

// TEMPORARY debug route — remove after diagnosing the B2/R2 env var issue.
export async function GET() {
  const configured = isR2Configured();
  let sampleUri: string | null = null;
  let roundTripKey: string | null = null;
  let error: string | null = null;
  try {
    sampleUri = getR2Uri('test/key.txt');
    roundTripKey = parseR2Uri(sampleUri)?.key ?? null;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    configured,
    sampleUri,
    roundTripKey,
    error,
    env: {
      OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT || null,
      OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION || null,
      OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET || null,
      OBJECT_STORAGE_FORCE_PATH_STYLE: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || null,
      OBJECT_STORAGE_ACCESS_KEY_ID_len: process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.length ?? null,
      OBJECT_STORAGE_SECRET_ACCESS_KEY_len: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.length ?? null,
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || null,
      R2_ACCESS_KEY_ID_len: process.env.R2_ACCESS_KEY_ID?.length ?? null,
      R2_BUCKET: process.env.R2_BUCKET || null,
    },
  });
}
