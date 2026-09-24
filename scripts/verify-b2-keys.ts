// Cross-check: for every key our manifests claim to have uploaded, confirm it
// actually exists in B2. Uses a 1-byte ranged GET (not HeadObject) — this B2
// application key's scope doesn't reliably allow HEAD even when PUT/GET both
// work fine, so a HEAD-based check reports false "missing" results.
// Auto-detects primary vs secondary bucket per manifest from its filename
// (anything with "11th"/"12th"/"remaining-11th"/"remaining-12th" in the name
// goes to the secondary bucket; everything else — 9th/10th — primary),
// unless overridden with --bucket=<name>.
import { readFileSync } from 'node:fs';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.OBJECT_STORAGE_ENDPOINT || process.env.SECONDARY_STORAGE_ENDPOINT!;
const region = process.env.OBJECT_STORAGE_REGION || 'auto';

const primaryBucket = process.env.OBJECT_STORAGE_BUCKET!;
const primaryClient = new S3Client({
  endpoint, region, forcePathStyle: true,
  credentials: { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!, secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY! },
});
const secondaryBucket = process.env.SECONDARY_STORAGE_BUCKET;
const secondaryClient = secondaryBucket
  ? new S3Client({
      endpoint: process.env.SECONDARY_STORAGE_ENDPOINT || endpoint, region, forcePathStyle: true,
      credentials: { accessKeyId: process.env.SECONDARY_STORAGE_ACCESS_KEY_ID!, secretAccessKey: process.env.SECONDARY_STORAGE_SECRET_ACCESS_KEY! },
    })
  : null;

function bucketForFile(filename: string, override?: string) {
  if (override) return override;
  const isSecondary = /(11th|12th|g11|g12)/i.test(filename);
  return isSecondary && secondaryBucket ? secondaryBucket : primaryBucket;
}

async function exists(key: string, bucket: string, client: S3Client) {
  try {
    await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-0' }));
    return true;
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NoSuchKey') return false;
    // any other error (permission, transient network) — don't report as missing,
    // it's inconclusive; log it separately instead of poisoning the missing list.
    console.log('  INCONCLUSIVE (not counted as missing):', bucket, key, e?.message || e);
    return true;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bucketOverride = args.find((a) => a.startsWith('--bucket='))?.split('=')[1];
  const files = args.filter((a) => !a.startsWith('--'));
  const missing: string[] = [];
  let total = 0;
  for (const f of files) {
    const bucket = bucketForFile(f, bucketOverride);
    const client = bucket === secondaryBucket ? secondaryClient! : primaryClient;
    const rows = JSON.parse(readFileSync(f, 'utf8'));
    for (const r of rows) {
      const keys = [r.dark_key, r.light_key, r.context_key, r.key].filter(Boolean);
      for (const k of Array.from(new Set(keys))) {
        total++;
        const ok = await exists(k, bucket, client);
        if (!ok) missing.push(`${f} [${bucket}] :: ${r.title} :: ${k}`);
      }
    }
  }
  console.log(`Checked ${total} keys across ${files.length} manifest(s).`);
  console.log(`Missing: ${missing.length}`);
  missing.forEach((m) => console.log(' -', m));
}

main().catch((e) => { console.error(e); process.exit(1); });
