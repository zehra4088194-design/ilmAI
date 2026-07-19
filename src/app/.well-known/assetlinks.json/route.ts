import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const statements =
    packageName && fingerprints.length
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(statements, {
    headers: {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
