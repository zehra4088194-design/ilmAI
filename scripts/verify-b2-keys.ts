// Cross-check: for every key our 11th/12th manifests claim to have uploaded,
// confirm it actually exists in the B2 bucket (HeadObject). Reports any missing.
import { readFileSync } from 'node:fs';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.OBJECT_STORAGE_ENDPOINT || process.env.S3_ENDPOINT || process.env.B2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.B2_KEY_ID!;
const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY!;
const bucket = process.env.OBJECT_STORAGE_BUCKET || process.env.R2_BUCKET || process.env.S3_BUCKET || process.env.B2_BUCKET!;
const region = process.env.OBJECT_STORAGE_REGION || process.env.S3_REGION || process.env.B2_REGION || 'auto';

const client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });

async function exists(key: string) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const files = process.argv.slice(2);
  const missing: string[] = [];
  let total = 0;
  for (const f of files) {
    const rows = JSON.parse(readFileSync(f, 'utf8'));
    for (const r of rows) {
      const keys = [r.dark_key, r.light_key, r.context_key, r.key].filter(Boolean);
      for (const k of Array.from(new Set(keys))) {
        total++;
        const ok = await exists(k);
        if (!ok) missing.push(`${f} :: ${r.title} :: ${k}`);
      }
    }
  }
  console.log(`Checked ${total} keys across ${files.length} manifest(s).`);
  console.log(`Missing: ${missing.length}`);
  missing.forEach((m) => console.log(' -', m));
}

main().catch((e) => { console.error(e); process.exit(1); });
