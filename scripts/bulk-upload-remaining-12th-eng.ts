// Grade 12 English general writing-skill resources (not tied to a numbered
// chapter — grammar/composition drills) from E:/remaining-data/12th-eng.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type Row = {
  subject_slug: 'english';
  chapter_slug: 'general';
  chapter_id: null;
  content_section: 'reading';
  title: string;
  book_title: string;
  light_key: string;
  dark_key: string;
  context_key: string | null;
  source: { light?: string; dark?: string; txt?: string };
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const root = 'E:/remaining-data/12th-eng';
  const darkFiles = readdirSync(root).filter((f) => /Dark\.pdf$/i.test(f));
  const rows: Row[] = [];
  for (const darkFile of darkFiles) {
    const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
    const base = darkFile.replace(/_Dark\.pdf$/i, '');
    const txtFile = `${base}.txt`;
    const label = base.replace(/^12th_English_/i, '').replace(/_/g, ' ');
    const keyBase = `library/english/general/reading/${slugify(label)}`;
    rows.push({
      subject_slug: 'english', chapter_slug: 'general', chapter_id: null, content_section: 'reading',
      title: `English — ${label}`,
      book_title: 'Class 12 English Notes (Punjab)',
      light_key: `${keyBase}.light.pdf`, dark_key: `${keyBase}.dark.pdf`,
      context_key: `${keyBase}.context.txt`,
      source: { dark: path.join(root, darkFile), light: path.join(root, lightFile), txt: path.join(root, txtFile) },
    });
  }
  console.log(`Discovered ${rows.length} resources.${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    for (const row of rows) {
      const bucket = process.env.SECONDARY_STORAGE_BUCKET;
      await putR2Object(row.dark_key, readFileSync(row.source.dark!), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket);
      await putR2Object(row.light_key, readFileSync(row.source.light!), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket);
      await putR2Object(row.context_key!, readFileSync(row.source.txt!), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, bucket);
      console.log('  uploaded', row.title);
    }
  }
  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-12th-eng-manifest.dryrun.json' : 'remaining-12th-eng-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log('Manifest written to:', manifestPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
