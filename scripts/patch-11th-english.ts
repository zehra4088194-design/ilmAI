// Targeted fix: the real run of bulk-upload-11th-library-resources.ts somehow
// produced 0 English rows (discoverEnglish11 came up empty that run, even
// though dry-run had 14). Re-run just English discovery+upload and append to
// the existing 11th-library-manifest.json instead of re-running the whole script.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const ROOT = 'E:/data/11th/notes';
const KEY_PREFIX = 'library/';

const CHAPTERS = [
  { name: 'Khatam-un-Nabiyeen Hazrat Muhammad (PBUH)', slug: 'g11-khatam-un-nabiyeen-hazrat-muhammad-pbuh', order: 1, id: 'cdf24b40-6010-4167-8546-3b981d5c0140' },
  { name: 'Responsibility of the Youth in Nation-Building', slug: 'g11-responsibility-of-the-youth-in-nation-building', order: 2, id: 'f0f40155-e9ee-4a12-b085-64394898f31d' },
  { name: 'A Bird, Came Down the Walk', slug: 'g11-a-bird-came-down-the-walk', order: 3, id: 'd33d4695-f17f-4b8b-91a4-1d00c2474831' },
  { name: 'Team Moon', slug: 'g11-team-moon', order: 4, id: 'f99ac1f6-845a-4851-b471-8c27577b5be3' },
  { name: 'Impact of Global Warming on Pakistan', slug: 'g11-impact-of-global-warming-on-pakistan', order: 5, id: 'eab041f7-3ca7-4eeb-85bc-728aa6af4c66' },
  { name: 'The Echoing Green', slug: 'g11-the-echoing-green', order: 6, id: '00aeaf1c-dbf0-40a7-b4a1-e402a4f896a9' },
  { name: 'What You do is What You are', slug: 'g11-what-you-do-is-what-you-are', order: 7, id: '58913d1c-b65b-4a34-aa6f-1deca4d4de86' },
  { name: 'Clean Water', slug: 'g11-clean-water', order: 8, id: '2347b155-9ccc-4800-a1b4-c171698f0572' },
  { name: 'Freedom', slug: 'g11-freedom', order: 9, id: '3dc7bb1a-f018-4acf-ac5f-c9fe74c9ab20' },
  { name: 'The Punishment of Shahpesh, Persian, on Khipil, the Builder', slug: 'g11-the-punishment-of-shahpesh-persian-on-khipil-the-builder', order: 10, id: '6ebdd57e-011a-4dc2-b28f-66993cf639ee' },
  { name: 'Those Winter Sundays', slug: 'g11-those-winter-sundays', order: 11, id: '9aec78d6-7288-4afc-8d6e-c550ae446dd6' },
  { name: 'The Impact of AI on Society, Human Relationships, and Ethics', slug: 'g11-the-impact-of-ai-on-society-human-relationships-and-ethics', order: 12, id: '1012d67d-f531-494e-9834-fc92f85dabfc' },
  { name: "Ruba'iyat", slug: 'g11-rubaiyat', order: 13, id: '7b0ead09-0a3b-472a-aa68-aecdc93e61ca' },
  { name: 'The End of the Beginning', slug: 'g11-the-end-of-the-beginning', order: 14, id: '7d48dc8f-c5ca-4019-93fe-84b431cd07cc' },
];

function slugify(v: string) { return v.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function main() {
  const dir = path.join(ROOT, 'eng', 'chapters');
  const files = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const rows: any[] = [];
  for (const chapter of CHAPTERS) {
    const file = files.find((f) => {
      const m = f.match(/Ch(\d+)\s+Notes/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    if (!file || !existsSync(path.join(dir, file))) { console.log('MISSING', chapter.name); continue; }
    const keyBase = `${KEY_PREFIX}english/${chapter.slug}/reading/${slugify(chapter.name)}-notes`;
    const key = `${keyBase}.dark.pdf`;
    await putR2Object(key, readFileSync(path.join(dir, file)), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' });
    console.log('uploaded', key);
    rows.push({
      subject_slug: 'english', chapter_slug: chapter.slug, chapter_id: chapter.id, content_section: 'reading',
      title: `English — Chapter ${chapter.order}: ${chapter.name} — Notes`,
      book_title: 'Class 11 English Notes (Punjab)',
      light_key: key, dark_key: key, context_key: null,
      source: { dark: path.join(dir, file), light: path.join(dir, file) },
    });
  }
  const manifestPath = path.join(process.cwd(), '11th-library-manifest.json');
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const merged = [...existing, ...rows];
  writeFileSync(manifestPath, JSON.stringify(merged, null, 2));
  console.log(`Appended ${rows.length} English rows. Manifest now has ${merged.length} rows.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
