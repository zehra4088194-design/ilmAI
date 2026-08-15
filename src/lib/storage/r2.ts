import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

let client: S3Client | null = null;
export const R2_SIGNED_URL_TTL_SECONDS = 18_000; // 5 hours

function getConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.OBJECT_STORAGE_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.B2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  // OBJECT_STORAGE_* takes priority — it's the actively-configured provider
  // (currently Backblaze B2). R2_*/S3_*/B2_* are only a fallback for stale
  // leftover env vars from an earlier Cloudflare R2 setup; letting those win
  // silently pointed the app at the wrong bucket/credentials.
  const accessKeyId =
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.S3_ACCESS_KEY_ID ||
    process.env.B2_KEY_ID;
  const secretAccessKey =
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.B2_APPLICATION_KEY;
  const bucket =
    process.env.OBJECT_STORAGE_BUCKET || process.env.R2_BUCKET || process.env.S3_BUCKET || process.env.B2_BUCKET;
  const region = process.env.OBJECT_STORAGE_REGION || process.env.S3_REGION || process.env.B2_REGION || 'auto';
  return endpoint && accessKeyId && secretAccessKey && bucket
    ? { accountId, accessKeyId, secretAccessKey, bucket, endpoint, region }
    : null;
}

function getClient(config: R2Config) {
  if (!client) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: Boolean(
        process.env.OBJECT_STORAGE_FORCE_PATH_STYLE ||
        process.env.S3_FORCE_PATH_STYLE ||
        process.env.B2_FORCE_PATH_STYLE
      ),
    });
  }
  return client;
}

export function isR2Configured() {
  return Boolean(getConfig());
}

export function getR2Uri(key: string) {
  const config = getConfig();
  if (!config) throw new Error('R2 is not configured.');
  return `r2://${config.bucket}/${key}`;
}

export function parseR2Uri(uri: string) {
  const config = getConfig();
  if (!config || !uri.startsWith(`r2://${config.bucket}/`)) return null;
  const key = uri.slice(`r2://${config.bucket}/`.length);
  return key && !key.includes('..') ? key : null;
}

export async function putR2Object(
  key: string,
  body: Uint8Array | Buffer | string,
  options: { contentType: string; cacheControl?: string; contentEncoding?: string }
) {
  const config = getConfig();
  if (!config) throw new Error('R2 is not configured.');
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

export async function getR2Object(key: string) {
  const config = getConfig();
  if (!config) return null;
  try {
    const signedUrl = await getR2SignedUrl(key);
    const result = await fetch(signedUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(90_000),
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

// Streaming counterpart to getR2Object: hands back the live response instead of buffering the
// whole object into memory first. getR2Object fully downloads the object server-side *before*
// sending a single byte to the browser — for a large PDF that serializes "download from B2" and
// "upload to the reader" one after another, roughly doubling the time-to-first-byte and eating
// the full request into one long window that a single dropped B2 connection anywhere in it turns
// into a hard failure. Streaming through means the browser starts receiving pages within a
// second of the request landing, and only a network drop during the (short) initial read below
// aborts the whole thing instead of one anywhere across the entire transfer.
export async function getR2ObjectStream(key: string, timeoutMs = 90_000) {
  const config = getConfig();
  if (!config) return null;
  try {
    const signedUrl = await getR2SignedUrl(key);
    const result = await fetch(signedUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (result.status === 404) return null;
    if (!result.ok) throw new Error(`Signed object fetch failed (${result.status}).`);
    if (!result.body) throw new Error('Signed object response had no body.');
    return {
      body: result.body,
      contentType: result.headers.get('content-type') || 'application/octet-stream',
      contentLength: Number(result.headers.get('content-length') || 0) || null,
    };
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NoSuchKey') return null;
    throw error;
  }
}

export async function getR2Text(key: string) {
  const object = await getR2Object(key);
  return object ? new TextDecoder().decode(object.body) : null;
}

export async function getR2SignedUrl(key: string, expiresIn = R2_SIGNED_URL_TTL_SECONDS) {
  const config = getConfig();
  if (!config) throw new Error('R2 is not configured.');
  if (!key || key.includes('..')) throw new Error('Invalid stored object key.');
  return getSignedUrl(getClient(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn,
  });
}

export async function deleteR2Object(key: string) {
  const config = getConfig();
  if (!config) return;
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
