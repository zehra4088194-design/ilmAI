import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let client: S3Client | null = null;

function getConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  return accountId && accessKeyId && secretAccessKey && bucket
    ? { accountId, accessKeyId, secretAccessKey, bucket }
    : null;
}

function getClient(config: R2Config) {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
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
    const result = await getClient(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return {
      body: Uint8Array.from(bytes).buffer,
      contentType: result.ContentType || 'application/octet-stream',
      contentEncoding: result.ContentEncoding || null,
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

export async function deleteR2Object(key: string) {
  const config = getConfig();
  if (!config) return;
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
