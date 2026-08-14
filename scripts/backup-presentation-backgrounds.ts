// One-time backup: download every presentation-background image from the OLD
// (main) B2 bucket to the user's Desktop, before migrating to the new
// dedicated presentation-backgrounds B2 account/bucket.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getR2Object } from '../src/lib/storage/r2';

const OUT_DIR = 'C:/Users/Ahmad/Desktop/presentation-backgrounds-backup';
const B2_PREFIX = 'presentation-backgrounds/';

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await supabase.from('presentation_backgrounds').select('storage_path');
  if (error) throw new Error(error.message);
  const rows = data as { storage_path: string }[];
  console.log(`Found ${rows.length} presentation backgrounds to back up.`);
  mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0, missing = 0;
  for (const { storage_path } of rows) {
    const obj = await getR2Object(`${B2_PREFIX}${storage_path}`);
    if (!obj) { console.log('  MISSING:', storage_path); missing++; continue; }
    writeFileSync(path.join(OUT_DIR, storage_path), Buffer.from(obj.body));
    ok++;
    if (ok % 25 === 0) console.log(`  ...${ok}/${rows.length}`);
  }
  console.log(`Done. Downloaded ${ok}, missing ${missing}. Saved to ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
