// Separate B2 (S3-compatible) client for presentation background images —
// deliberately isolated from src/lib/storage/r2.ts (the main library/resources
// bucket) so this content lives in its own B2 account/bucket and never shares
// storage quota or credentials with the main bucket. Same shape as r2.ts.
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

let client: S3Client | null = null;
export const PRESENTATION_R2_SIGNED_URL_TTL_SECONDS = 18_000; // 5 hours

function getConfig(): R2Config | null {
  const endpoint = process.env.PRESENTATION_STORAGE_ENDPOINT || '';
  const accessKeyId = process.env.PRESENTATION_STORAGE_ACCESS_KEY_ID || process.env.PRESENTATION_STORAGE_KEY_ID;
  const secretAccessKey =
    process.env.PRESENTATION_STORAGE_SECRET_ACCESS_KEY || process.env.PRESENTATION_STORAGE_APPLICATION_KEY;
  const bucket = process.env.PRESENTATION_STORAGE_BUCKET;
  const region = process.env.PRESENTATION_STORAGE_REGION || 'auto';
  return endpoint && accessKeyId && secretAccessKey && bucket
    ? { accessKeyId, secretAccessKey, bucket, endpoint, region }
    : null;
}

function getClient(config: R2Config) {
  if (!client) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: Boolean(process.env.PRESENTATION_STORAGE_FORCE_PATH_STYLE),
    });
  }
  return client;
}

export function isPresentationR2Configured() {
  return Boolean(getConfig());
}

export async function putPresentationR2Object(
  key: string,
  body: Uint8Array | Buffer | string,
  options: { contentType: string; cacheControl?: string; contentEncoding?: string }
) {
  const config = getConfig();
  if (!config) throw new Error('Presentation object storage is not configured (missing PRESENTATION_STORAGE_* env vars).');
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
      ContentEncoding: options.contentEncoding,
    })
  );
}

export async function getPresentationR2Object(key: string) {
  const config = getConfig();
  if (!config) return null;
  try {
    const signedUrl = await getPresentationR2SignedUrl(key);
    const result = await fetch(signedUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    });
    if (result.status === 404) return null;
    if (!result.ok) throw new Error(`Signed object fetch failed (${result.status}).`);
    const bytes = await result.arrayBuffer();
    return {
      body: bytes,
      contentType: result.headers.get('content-type') || 'application/octet-stream',
      contentEncoding: result.headers.get('content-encoding'),
    };
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NoSuchKey') return null;
    throw error;
  }
}

export async function getPresentationR2SignedUrl(key: string, expiresIn = PRESENTATION_R2_SIGNED_URL_TTL_SECONDS) {
  const config = getConfig();
  if (!config) throw new Error('Presentation object storage is not configured.');
  if (!key || key.includes('..')) throw new Error('Invalid stored object key.');
  return getSignedUrl(getClient(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn,
  });
}

export async function deletePresentationR2Object(key: string) {
  const config = getConfig();
  if (!config) return;
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
