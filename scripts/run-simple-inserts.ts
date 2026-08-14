// Inserts textbook / pairing-scheme rows (subject-level, no chapter, resource_type
// varies) using the Supabase JS client directly.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/run-simple-inserts.ts textbooks 9th-textbooks-manifest.json GRADE_9
//   npx tsx --env-file=.env.local scripts/run-simple-inserts.ts pairing pairing-schemes-manifest.json

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

async function main() {
  const mode = process.argv[2]; // 'textbooks' | 'pairing'
  const manifestPath = process.argv[3];
  const gradeLevel = process.argv[4]; // only needed for textbooks (pairing already carries its own grade)

  const rows = JSON.parse(readFileSync(manifestPath, 'utf8'));
  console.log(`Loaded ${rows.length} rows (${mode})`);

  let payload: any[];
  if (mode === 'textbooks') {
    payload = rows.map((r: any) => {
      const url = `r2://${BUCKET}/${r.key}`;
      return {
        title: r.title,
        subject_id: SUBJECT_IDS[r.subject_slug],
        chapter_id: null,
        grade_level: gradeLevel,
        drive_url: url,
        resource_type: 'text_book',
        content_section: 'reading',
        book_title: r.book_title,
        light_file_url: url,
        dark_file_url: url,
        context_text_url: null,
      };
    });
  } else if (mode === 'pairing') {
    payload = rows.map((r: any) => {
      const lightUrl = `r2://${BUCKET}/${r.light_key}`;
      const darkUrl = `r2://${BUCKET}/${r.dark_key}`;
      return {
        title: r.title,
        subject_id: SUBJECT_IDS[r.subject_slug],
        chapter_id: null,
        grade_level: r.grade,
        drive_url: lightUrl,
        resource_type: 'pairing_scheme',
        content_section: 'reading',
        book_title: r.book_title,
        light_file_url: lightUrl,
        dark_file_url: darkUrl,
        context_text_url: null,
      };
    });
  } else {
    throw new Error('mode must be textbooks or pairing');
  }

  const missing = payload.filter((p) => !p.subject_id);
  if (missing.length) {
    console.error('Missing subject_id for:', missing.map((m) => m.title));
    process.exit(1);
  }

  const { error } = await supabase.from('library_resources').insert(payload);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
  console.log(`Inserted ${payload.length} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
