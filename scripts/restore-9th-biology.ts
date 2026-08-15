// Restores the 33 pre-existing grade-9 Biology library_resources (11 chapters
// x mcq/short/long) that predate this session's bulk-upload scripts and got
// deleted from B2 along with everything else. Driven directly by the existing
// Supabase rows' dark_file_url/light_file_url/context_text_url (source of
// truth for the exact B2 keys) instead of a manifest.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/9th/notes/biology';
const BUCKET = 'ilmai-storage-b2';

function keyFromR2Uri(uri: string | null) {
  if (!uri) return null;
  return uri.replace(`r2://${BUCKET}/`, '');
}

function findChapterFolder(chapterNum: number) {
  const folders = readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory());
  return folders.find((f) => f.name.match(new RegExp(`^${chapterNum}\\.`)))?.name;
}

async function uploadIfExists(key: string | null, filePath: string) {
  if (!key || !existsSync(filePath)) return false;
  const contentType = key.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/pdf';
  await putR2Object(key, readFileSync(filePath), { contentType, cacheControl: 'public, max-age=31536000, immutable' });
  return true;
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows, error } = await supabase
    .from('library_resources')
    .select('title, dark_file_url, light_file_url, context_text_url')
    .eq('subject_id', '0af743bf-d092-4560-a91b-93b63dc4a7f4')
    .eq('grade_level', 'GRADE_9')
    .like('title', 'Biology — Chapter%');
  if (error) throw new Error(error.message);
  console.log(`Found ${rows.length} chapter-level Biology rows to restore.`);

  let uploaded = 0, missing = 0;
  for (const row of rows) {
    const m = row.title.match(/Chapter (\d+).*—\s*(MCQs|Short Questions|Long Questions)/);
    if (!m) { console.log('  SKIP (title mismatch):', row.title); continue; }
    const chapterNum = Number(m[1]);
    const kind = m[2] === 'MCQs' ? 'MCQs' : m[2] === 'Short Questions' ? 'ShortQ' : 'LongQ';
    const folder = findChapterFolder(chapterNum);
    if (!folder) { console.log('  NO LOCAL FOLDER for chapter', chapterNum, row.title); missing++; continue; }
    const darkDir = path.join(ROOT, folder, 'dark');
    const lightDir = path.join(ROOT, folder, 'light');
    const txtDir = path.join(ROOT, folder, 'txt');
    const darkFile = existsSync(darkDir) ? readdirSync(darkDir).find((f) => f.includes(kind)) : null;
    if (!darkFile) { console.log('  NO LOCAL FILE for', row.title); missing++; continue; }
    const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
    const txtFile = darkFile.replace(/\.pdf$/i, '.txt');

    const okDark = await uploadIfExists(keyFromR2Uri(row.dark_file_url), path.join(darkDir, darkFile));
    const okLight = await uploadIfExists(keyFromR2Uri(row.light_file_url), path.join(lightDir, lightFile));
    const okTxt = await uploadIfExists(keyFromR2Uri(row.context_text_url), path.join(txtDir, txtFile));
    if (okDark || okLight) { uploaded++; console.log('  restored:', row.title, okDark ? 'dark' : '', okLight ? 'light' : '', okTxt ? 'txt' : ''); }
    else { console.log('  FAILED:', row.title); missing++; }
  }
  console.log(`Done. Restored ${uploaded}, missing/failed ${missing}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
