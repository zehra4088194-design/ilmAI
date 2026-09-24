import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BUCKET = 'ilmai-storage-b2';
const ROOT = 'E:/data/9th/notes/biology';

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
function slugify(v: string) { return v.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function titleCase(v: string) { return v.split(/[\s_-]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' '); }

async function main() {
  const { data: subj } = await supabase.from('subjects').select('id').eq('name', 'Biology').single();
  const { data: chaptersRaw } = await supabase.from('chapters').select('id, name, slug, order_index, grade_levels').eq('subject_id', subj!.id).order('order_index');
  const chapters = (chaptersRaw || []).filter((c: any) => (c.grade_levels || []).includes('GRADE_9'));
  console.log(`Found ${chapters.length} Grade 9 Biology chapters in DB.`);

  const files = walk(ROOT).filter((f) => /\.(pdf|txt)$/i.test(f));
  const groups = new Map<string, { dark?: string; light?: string; txt?: string; num: number; section: string; topicRaw: string }>();

  for (const f of files) {
    const base = path.basename(f);
    const dirName = path.basename(path.dirname(path.dirname(f))) || path.basename(path.dirname(f));
    // folder like "1.The Science of Biology" - leading number
    const m = path.win32.basename(path.dirname(path.dirname(f))).match(/^(\d+)\./);
    if (!m) continue;
    const num = Number(m[1]);
    if (num < 1 || num > chapters.length) continue;
    const l = base.toLowerCase();
    let section = 'reading';
    if (/mcq/.test(l)) section = 'mcq';
    else if (/short/.test(l)) section = 'short';
    else if (/long/.test(l)) section = 'long';
    const isDark = /dark/i.test(base);
    const isLight = /light/i.test(base);
    const isTxt = /\.txt$/i.test(base);
    let topicKey = base.replace(/\.(pdf|txt)$/i, '').replace(/[-_ ]?(dark|light)$/i, '');
    const key = `${num}::${section}::${topicKey.toLowerCase().replace(/[^a-z0-9]/gi, '')}`;
    const g = groups.get(key) || { num, section, topicRaw: topicKey };
    if (isTxt) g.txt = f; else if (isDark) g.dark = f; else if (isLight) g.light = f;
    groups.set(key, g);
  }

  const rows: any[] = [];
  for (const [, g] of groups) {
    if (!g.dark && !g.light) continue;
    const chapter = chapters[g.num - 1]!;
    const label = g.section === 'mcq' ? 'MCQs' : g.section === 'short' ? 'Short Questions' : g.section === 'long' ? 'Long Questions' : 'Notes';
    const titleSlug = `${slugify(chapter.name)}-${g.section}-${slugify(g.topicRaw).slice(0, 40)}`;
    const keyBase = `library/biology/${chapter.slug}/${g.section}/${titleSlug}`;
    rows.push({
      subject_id: subj!.id,
      grade_level: 'GRADE_9',
      chapter_id: chapter.id,
      content_section: g.section,
      title: `Biology — ${chapter.name} — ${titleCase(g.topicRaw)} — ${label}`,
      book_title: 'Class 9 Biology Notes (Punjab)',
      dark_key: g.dark ? `${keyBase}.dark.pdf` : g.light ? `${keyBase}.light.pdf` : null,
      light_key: g.light ? `${keyBase}.light.pdf` : g.dark ? `${keyBase}.dark.pdf` : null,
      context_key: g.txt ? `${keyBase}.context.txt` : null,
      source: { dark: g.dark, light: g.light, txt: g.txt },
    });
  }

  console.log(`Discovered ${rows.length} Biology rows.`);
  let uploaded = 0;
  for (const row of rows) {
    const uploads: Promise<void>[] = [];
    if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
    if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
    if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }));
    await Promise.all(uploads);
    uploaded++;
  }
  console.log(`Uploaded ${uploaded} files.`);

  function r2Url(key: string | null) { return key ? `r2://${BUCKET}/${key}` : null; }
  const payload = rows.map((r) => ({
    title: r.title, subject_id: r.subject_id, chapter_id: r.chapter_id, grade_level: r.grade_level,
    drive_url: r2Url(r.light_key) || r2Url(r.dark_key), resource_type: 'notes', content_section: r.content_section,
    book_title: r.book_title, light_file_url: r2Url(r.light_key), dark_file_url: r2Url(r.dark_key), context_text_url: r2Url(r.context_key),
  }));
  const { error } = await supabase.from('library_resources').insert(payload);
  if (error) { console.error('Insert failed:', error.message); process.exit(1); }
  console.log(`Inserted ${payload.length} rows.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
