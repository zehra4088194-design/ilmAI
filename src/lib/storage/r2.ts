import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
};

const clients = new Map<string, S3Client>();
export const R2_SIGNED_URL_TTL_SECONDS = 18_000; // 5 hours

function getPrimaryConfig(): R2Config | null {
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
  const forcePathStyle = Boolean(
    process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE || process.env.B2_FORCE_PATH_STYLE
  );
  return endpoint && accessKeyId && secretAccessKey && bucket
    ? { accountId, accessKeyId, secretAccessKey, bucket, endpoint, region, forcePathStyle }
    : null;
}

// Second B2 account/bucket, used for 11th/12th grade library content — a
// different account than the primary bucket, so it needs its own
// credentials (a B2 application key only ever grants access to buckets in
// its own account). Same read/write helpers below transparently pick the
// right one based on which bucket a given r2:// URI names.
function getSecondaryConfig(): R2Config | null {
  const endpoint = process.env.SECONDARY_STORAGE_ENDPOINT || process.env.OBJECT_STORAGE_ENDPOINT || '';
  const accessKeyId = process.env.SECONDARY_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECONDARY_STORAGE_SECRET_ACCESS_KEY;
  const bucket = process.env.SECONDARY_STORAGE_BUCKET;
  const region = process.env.SECONDARY_STORAGE_REGION || process.env.OBJECT_STORAGE_REGION || 'auto';
  const forcePathStyle = Boolean(process.env.SECONDARY_STORAGE_FORCE_PATH_STYLE || process.env.OBJECT_STORAGE_FORCE_PATH_STYLE);
  return endpoint && accessKeyId && secretAccessKey && bucket
    ? { accessKeyId, secretAccessKey, bucket, endpoint, region, forcePathStyle }
    : null;
}

// Third B2 account/bucket, dedicated to the Rest & Audio library (relaxing
// playlists, spoken-word tracks, etc). Kept separate from the primary and
// secondary buckets for the same reason as the secondary one — its own B2
// account, its own application key — and so audio storage cost/usage stays
// isolated and easy to reason about on its own bucket dashboard.
function getAudioConfig(): R2Config | null {
  const endpoint = process.env.AUDIO_STORAGE_ENDPOINT || process.env.OBJECT_STORAGE_ENDPOINT || '';
  const accessKeyId = process.env.AUDIO_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AUDIO_STORAGE_SECRET_ACCESS_KEY;
  const bucket = process.env.AUDIO_STORAGE_BUCKET;
  const region = process.env.AUDIO_STORAGE_REGION || process.env.OBJECT_STORAGE_REGION || 'auto';
  const forcePathStyle = Boolean(
    process.env.AUDIO_STORAGE_FORCE_PATH_STYLE || process.env.OBJECT_STORAGE_FORCE_PATH_STYLE
  );
  return endpoint && accessKeyId && secretAccessKey && bucket
    ? { accessKeyId, secretAccessKey, bucket, endpoint, region, forcePathStyle }
    : null;
}

// Name of the configured audio bucket, if any — for call sites (upload
// routes) that need to pass an explicit `bucket` to putR2Object/getR2Uri
// instead of falling through to the primary bucket.
export function getAudioBucketName(): string | null {
  return getAudioConfig()?.bucket || null;
}

export function isAudioStorageConfigured() {
  return Boolean(getAudioConfig());
}

function allConfigs(): R2Config[] {
  return [getPrimaryConfig(), getSecondaryConfig(), getAudioConfig()].filter((c): c is R2Config => c !== null);
}

// Resolves which configured bucket to use: an explicit bucket name (from a
// parsed r2:// URI) if given and known, otherwise the primary bucket —
// preserving old behavior for every call site that still passes a bare key.
//
// Secondary bucket temporarily DISABLED (single-bucket setup): any call site
// that still names the secondary bucket (env var SECONDARY_STORAGE_BUCKET, or
// an old r2:// URI pointing at it) is transparently redirected to the primary
// bucket here instead — one central switch instead of touching every script
// and call site that used to route 11th/12th grade content to a second B2
// account/bucket.
function resolveConfig(bucket?: string): R2Config | null {
  const configs = allConfigs();
  const primary = getPrimaryConfig();
  if (bucket) {
    if (bucket === process.env.SECONDARY_STORAGE_BUCKET) return primary;
    return configs.find((c) => c.bucket === bucket) || primary;
  }
  return configs[0] || null;
}

function getClient(config: R2Config) {
  const cacheKey = `${config.endpoint}::${config.bucket}`;
  let existing = clients.get(cacheKey);
  if (!existing) {
    existing = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: config.forcePathStyle,
    });
    clients.set(cacheKey, existing);
  }
  return existing;
}

export function isR2Configured() {
  return Boolean(resolveConfig());
}

export function getR2Uri(key: string, bucket?: string) {
  const config = resolveConfig(bucket);
  if (!config) throw new Error('R2 is not configured.');
  return `r2://${config.bucket}/${key}`;
}

// Returns {bucket, key} for any r2:// URI whose bucket matches a configured
// bucket (primary or secondary) — not just the primary one.
export function parseR2Uri(uri: string): { bucket: string; key: string } | null {
  const match = uri.match(/^r2:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, key] = match;
  if (!key || key.includes('..')) return null;
  if (!resolveConfig(bucket)) return null;
  return { bucket: bucket!, key };
}

// LOCAL_LIBRARY_STAGING_DIR (admin script escape hatch): when set, putR2Object
// writes the file to <dir>/<key> on local disk instead of uploading to B2 —
// used to build an exact-mirror local folder tree of everything that WOULD be
// uploaded, for a human to bulk-upload themselves via a more reliable tool
// (rclone/b2 CLI sync) than one-file-at-a-time Node uploads over a flaky link.
async function writeLocalStagingFile(key: string, body: Uint8Array | Buffer | string) {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const dest = path.join(process.env.LOCAL_LIBRARY_STAGING_DIR!, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, body as any);
}

export async function putR2Object(
  key: string,
  body: Uint8Array | Buffer | string,
  options: { contentType: string; cacheControl?: string; contentEncoding?: string },
  bucket?: string
) {
  if (process.env.LOCAL_LIBRARY_STAGING_DIR) return writeLocalStagingFile(key, body);
  const config = resolveConfig(bucket);
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

export async function getR2Object(key: string, bucket?: string) {
  const config = resolveConfig(bucket);
  if (!config) return null;
  try {
    const signedUrl = await getR2SignedUrl(key, R2_SIGNED_URL_TTL_SECONDS, bucket);
    const result = await fetchWithRetry(signedUrl, 90_000);
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
// B2/R2 occasionally drops or resets a connection with no server-side error at all — the signed
// URL itself is still valid, a second attempt just works. Previously a single flaky connection
// anywhere (cold connection, transient network blip) surfaced as a hard "Failed to load PDF file"
// to the student with no automatic recovery, even though the file was never actually missing —
// this is what was showing up across many otherwise-fine library/class-library PDFs. One retry
// with a short backoff before giving up costs nothing on the common case (first attempt succeeds)
// and turns most of those transient failures into an invisible extra second of load time instead.
const R2_FETCH_RETRIES = 2;
const R2_FETCH_RETRY_DELAY_MS = 400;

async function fetchWithRetry(url: string, timeoutMs: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= R2_FETCH_RETRIES; attempt++) {
    try {
      const result = await fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      // A 404 is a real "the file isn't there" answer, not a transient failure — retrying it
      // wastes time and can never succeed, so it's returned immediately instead of retried.
      if (result.status === 404 || result.ok) return result;
      lastError = new Error(`Signed object fetch failed (${result.status}).`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < R2_FETCH_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, R2_FETCH_RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function getR2ObjectStream(key: string, timeoutMs = 90_000, bucket?: string) {
  const config = resolveConfig(bucket);
  if (!config) return null;
  try {
    const signedUrl = await getR2SignedUrl(key, R2_SIGNED_URL_TTL_SECONDS, bucket);
    const result = await fetchWithRetry(signedUrl, timeoutMs);
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

export async function getR2Text(key: string, bucket?: string) {
  const object = await getR2Object(key, bucket);
  return object ? new TextDecoder().decode(object.body) : null;
}

export async function getR2SignedUrl(key: string, expiresIn = R2_SIGNED_URL_TTL_SECONDS, bucket?: string) {
  const config = resolveConfig(bucket);
  if (!config) throw new Error('R2 is not configured.');
  if (!key || key.includes('..')) throw new Error('Invalid stored object key.');
  return getSignedUrl(getClient(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn,
  });
}

export async function deleteR2Object(key: string, bucket?: string) {
  const config = resolveConfig(bucket);
  if (!config) return;
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
