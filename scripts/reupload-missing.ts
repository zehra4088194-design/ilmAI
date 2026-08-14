// Re-upload only the keys that verify-b2-keys.ts found missing from B2 (many
// of this session's "successful" uploads apparently silently failed/hung —
// see HANDOFF). Re-reads source paths straight from the manifest so it can
// target just the gaps instead of re-uploading everything.
import dns from 'node:dns';
import { existsSync, readFileSync } from 'node:fs';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { putR2Object } from '../src/lib/storage/r2';

// B2's hostname resolves to both IPv6 and IPv4 addresses; on this network the
// IPv6 routes appear to be unreachable (hence the recurring ENOTFOUND/UnknownError
// blips), while plain `nslookup` succeeds because the system resolver falls
// back better than Node's default dual-stack lookup order. Prefer IPv4 first.
dns.setDefaultResultOrder('ipv4first');

const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.OBJECT_STORAGE_ENDPOINT || process.env.S3_ENDPOINT || process.env.B2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.B2_KEY_ID!;
const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY!;
const bucket = process.env.OBJECT_STORAGE_BUCKET || process.env.R2_BUCKET || process.env.S3_BUCKET || process.env.B2_BUCKET!;
const region = process.env.OBJECT_STORAGE_REGION || process.env.S3_REGION || process.env.B2_REGION || 'auto';
const client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// B2 has periodic transient DNS blips (ENOTFOUND) mid-session — retry with
// backoff instead of letting one blip kill the whole run.
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = Math.min(30000, 2000 * 2 ** i);
      console.log(`  retry ${i + 1}/${attempts} for ${label} after ${delay}ms (${(e as Error)?.message})`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function exists(key: string) {
  try {
    await withRetry(() => client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })), `HEAD ${key}`);
    return true;
  } catch {
    return false;
  }
}

function contentTypeFor(key: string) {
  return key.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/pdf';
}

async function reuploadKey(key: string, sourcePath: string) {
  if (!existsSync(sourcePath)) {
    console.log('  SOURCE MISSING for', key, '<-', sourcePath);
    return false;
  }
  try {
    await withRetry(
      () => putR2Object(key, readFileSync(sourcePath), { contentType: contentTypeFor(key), cacheControl: 'public, max-age=31536000, immutable' }),
      `PUT ${key}`
    );
    return true;
  } catch (e) {
    console.log('  GAVE UP on', key, (e as Error)?.message);
    return false;
  }
}

async function main() {
  // NOTE: HeadObjectCommand (the existence check) consistently fails on this
  // B2 key even though PutObjectCommand succeeds — the key is almost
  // certainly write-only scoped, no read/HEAD permission. So: skip the
  // exists() check entirely and just re-upload every key directly. This is
  // safe (uploads are idempotent, same key overwrites) and much faster than
  // the previous exists-then-upload flow, which wasted ~90s per file retrying
  // a HEAD call that could never succeed.
  const files = process.argv.slice(2);
  let checked = 0, reuploaded = 0, sourceMissing = 0;
  for (const f of files) {
    const rows = JSON.parse(readFileSync(f, 'utf8'));
    for (const r of rows) {
      const pairs: [string | null | undefined, string | undefined][] = r.key
        ? [[r.key, r.source]]
        : [
            [r.dark_key, r.source?.dark],
            [r.light_key && r.light_key !== r.dark_key ? r.light_key : null, r.source?.light],
            [r.context_key, r.source?.txt],
          ];
      for (const [key, source] of pairs) {
        if (!key || !source) continue;
        checked++;
        const success = await reuploadKey(key, source);
        if (success) { reuploaded++; console.log('  re-uploaded', key); }
        else sourceMissing++;
        if (checked % 50 === 0) console.log(`...checked ${checked} (${reuploaded} re-uploaded so far)`);
      }
    }
  }
  console.log(`Done. Checked ${checked}, re-uploaded ${reuploaded}, source-missing ${sourceMissing}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
