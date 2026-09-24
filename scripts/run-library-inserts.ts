// Runs the actual DB writes for the 9th/10th library_resources rollout using
// the Supabase JS client directly (service-role key) instead of pasting huge
// SQL blobs through a tool call each time. Reads the same manifest JSON files
// the upload scripts already produced.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/run-library-inserts.ts <manifest.json> [--grade9-generated]

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error('Missing Supabase service-role env vars.');
const supabase = createClient(url, key);

const BUCKET = 'ilmai-storage-b2';

const SUBJECT_IDS: Record<string, string> = {
  biology: '0af743bf-d092-4560-a91b-93b63dc4a7f4',
  chemistry: '4d116283-9f21-41f9-a963-150f8ceec665',
  'computer-science': 'e97c5d3b-85ae-47c9-befe-e4936b4b7d30',
  physics: 'b9223153-db12-415c-a533-311903e62f13',
  english: '606c9192-1fe6-469d-887f-274d9b4caf06',
  urdu: '6e4f47c7-4a56-4773-a18d-d8408a9399ed',
  mathematics: 'd8723997-66a7-4479-9476-007d1966c6b0',
  'tarjuma-tul-quran': '0d776870-3900-4bca-83ae-ec081d1ab087',
  islamiat: 'dafd0504-d665-44ab-b7d2-3db8a95f4fd1',
  'pakistan-studies': '09b5a663-27db-42a9-94fc-01de6694a58c',
};

type Row = {
  subject_slug: string;
  chapter_id: string | null;
  content_section: 'reading' | 'mcq' | 'short' | 'long';
  title: string;
  book_title: string;
  light_key: string | null;
  dark_key: string | null;
  context_key: string | null;
};

function r2Url(key: string | null) {
  return key ? `r2://${BUCKET}/${key}` : null;
}

async function main() {
  const manifestPath = process.argv[2];
  const gradeLevel = process.argv[3]; // e.g. GRADE_9 / GRADE_10
  if (!manifestPath || !gradeLevel) {
    console.error('Usage: run-library-inserts.ts <manifest.json> <GRADE_9|GRADE_10>');
    process.exit(1);
  }
  const rows: Row[] = JSON.parse(readFileSync(manifestPath, 'utf8'));
  console.log(`Loaded ${rows.length} rows from ${manifestPath} for ${gradeLevel}`);

  const payload = rows.map((row) => {
    const lightUrl = r2Url(row.light_key);
    const darkUrl = r2Url(row.dark_key);
    const contextUrl = r2Url(row.context_key);
    return {
      title: row.title,
      subject_id: SUBJECT_IDS[row.subject_slug],
      chapter_id: row.chapter_id,
      grade_level: gradeLevel,
      drive_url: lightUrl || darkUrl,
      resource_type: 'notes',
      content_section: row.content_section,
      book_title: row.book_title,
      light_file_url: lightUrl,
      dark_file_url: darkUrl,
      context_text_url: contextUrl,
    };
  });

  const missingSubject = payload.filter((p) => !p.subject_id);
  if (missingSubject.length) {
    console.error('Rows with unknown subject_slug (no subject_id mapping):', missingSubject.length);
    console.error(missingSubject.slice(0, 5));
    process.exit(1);
  }

  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from('library_resources').insert(chunk);
    if (error) {
      console.error(`Insert failed at rows ${i}-${i + chunk.length}:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`  inserted ${inserted}/${payload.length}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
