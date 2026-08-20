// Imports ChatGPT-extracted question JSON (see chatgpt-question-extraction-prompt.txt)
// into Supabase. Matches each entry's "filename" against every known
// manifest's source .txt path (basename match) to find which resource it
// belongs to, then upserts into resource_mcq_sets AND public.questions.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-question-json.ts <path-to-json-file>
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

type ManifestRow = {
  title: string;
  chapter_id?: string | null;
  subject_slug?: string;
  content_section?: string;
  source?: { txt?: string };
};

function loadAllManifests(): Map<string, ManifestRow> {
  const byBasename = new Map<string, ManifestRow>();
  const files = readdirSync(process.cwd()).filter(
    (f) => f.endsWith('-manifest.json') && !f.includes('.dryrun.')
  );
  for (const f of files) {
    try {
      const rows: ManifestRow[] = JSON.parse(readFileSync(f, 'utf8'));
      for (const row of rows) {
        const txtPath = row.source?.txt;
        if (!txtPath) continue;
        const base = path.basename(txtPath).toLowerCase();
        byBasename.set(base, row);
      }
    } catch {
      // skip unreadable/non-array manifest files
    }
  }
  return byBasename;
}

type GptEntry = {
  filename: string;
  questions?: any[];
  short_questions?: any[];
  long_questions?: any[];
};

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: import-question-json.ts <path-to-json-file>');
    process.exit(1);
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const entries: GptEntry[] = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const manifestByBasename = loadAllManifests();
  console.log(`Loaded ${manifestByBasename.size} known source files across all manifests.`);
  console.log(`Processing ${entries.length} entries from ${jsonPath}.`);

  let matched = 0, unmatched = 0, inserted = 0;
  for (const entry of entries) {
    const base = path.basename(entry.filename).toLowerCase();
    const manifestRow = manifestByBasename.get(base);
    if (!manifestRow) {
      console.log('  NO MATCH for filename:', entry.filename);
      unmatched++;
      continue;
    }
    matched++;

    const { data: resource, error: findError } = await supabase
      .from('library_resources')
      .select('id, subject_id, chapter_id, grade_level, title')
      .eq('title', manifestRow.title)
      .maybeSingle();
    if (findError || !resource) {
      console.log('  Resource row not found in DB for title:', manifestRow.title);
      continue;
    }

    const { error: upsertError } = await supabase.from('resource_mcq_sets').upsert(
      {
        resource_kind: 'library',
        resource_id: resource.id,
        questions: entry.questions || [],
        short_questions: entry.short_questions || [],
        long_questions: entry.long_questions || [],
        status: 'ready',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'resource_kind,resource_id' }
    );
    if (upsertError) {
      console.log('  resource_mcq_sets upsert failed for', manifestRow.title, ':', upsertError.message);
      continue;
    }

    // Mirror into public.questions too (manually-curated bank used by
    // diagnostic + elsewhere), matching the shape the app expects.
    const questionRows: any[] = [];
    for (const mcq of entry.questions || []) {
      if (!mcq.q || !Array.isArray(mcq.opts) || mcq.opts.length < 2) continue;
      questionRows.push({
        chapter_id: resource.chapter_id, subject_id: resource.subject_id, type: 'MCQ', difficulty: 'MEDIUM',
        text: mcq.q, options: mcq.opts, correct_answer: mcq.correct ?? 0, explanation: mcq.exp || null,
        marks: 1, is_verified: true, is_demo_eligible: false, source_kind: 'library', source_id: resource.id,
        tags: [], metadata: {},
      });
    }
    for (const sq of entry.short_questions || []) {
      if (!sq.q) continue;
      questionRows.push({
        chapter_id: resource.chapter_id, subject_id: resource.subject_id, type: 'SHORT', difficulty: 'MEDIUM',
        text: sq.q, options: null, correct_answer: sq.modelAnswer || '', explanation: null,
        marks: sq.marks || 3, is_verified: true, is_demo_eligible: false, source_kind: 'library', source_id: resource.id,
        tags: [], metadata: {},
      });
    }
    for (const lq of entry.long_questions || []) {
      if (!lq.q) continue;
      questionRows.push({
        chapter_id: resource.chapter_id, subject_id: resource.subject_id, type: 'LONG', difficulty: 'MEDIUM',
        text: lq.q, options: null, correct_answer: lq.modelAnswer || '', explanation: null,
        marks: lq.marks || 8, is_verified: true, is_demo_eligible: false, source_kind: 'library', source_id: resource.id,
        tags: [], metadata: {},
      });
    }
    if (questionRows.length) {
      const { error: qError } = await supabase.from('questions').insert(questionRows);
      if (qError) console.log('  questions insert failed for', manifestRow.title, ':', qError.message);
    }

    inserted++;
    console.log(`  done: ${manifestRow.title} (${(entry.questions||[]).length} mcq, ${(entry.short_questions||[]).length} short, ${(entry.long_questions||[]).length} long)`);
  }
  console.log(`\nMatched ${matched}/${entries.length}, unmatched ${unmatched}, inserted/upserted ${inserted}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
