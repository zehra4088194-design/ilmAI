const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const ENGLISH_SECTIONS = {
  'English - Applications': { order: 101, name: 'Writing Skills: Applications' },
  'English - Chapter 1: The Saviour of Mankind': { order: 1, name: 'Chapter 1: The Saviour of Mankind' },
  'English - Chapter 2: Patriotism': { order: 2, name: 'Chapter 2: Patriotism' },
  'English - Chapter 3: Daffodils': { order: 3, name: 'Chapter 3: Daffodils' },
  'English - Chapter 4: Hazrat Asma': { order: 4, name: 'Chapter 4: Hazrat Asma' },
  'English - Chapter 8: Globalisation': {
    order: 8,
    name: 'Chapter 8: The Impact of Globalisation on Culture and Economy',
  },
  'English - Chapter 9: Quality Education': {
    order: 9,
    name: 'Chapter 9: Quality Education: A Key to Success',
  },
  'English - Chapter 10: Snow Leopard Markhor': {
    order: 10,
    name: 'Chapter 10: The Silent Predator and the Majestic Prey - Snow Leopard and Markhor',
  },
  'English - Chapter 11: Notes': { order: 11, name: 'Chapter 11: The Dear Departed' },
  'English - Idioms and Phrases': { order: 102, name: 'Vocabulary: Idioms and Phrases' },
  'English - Letters': { order: 103, name: 'Writing Skills: Letters' },
  'English - Stories': { order: 104, name: 'Writing Skills: Stories' },
  'English - Unit 5: Women Empowerment': {
    order: 5,
    name: 'Chapter 5: Women Empowerment through Entrepreneurship',
  },
  'English - Unit 6: Value Of Time': { order: 6, name: 'Chapter 6: The Value of Time' },
  'English - Unit 7: If': { order: 7, name: 'Chapter 7: If' },
};

const VERIFIED_NAME_FIXES = new Map([
  ['Chapter 1: The Science Of Biology', 'Chapter 1: The Science of Biology'],
  ['Chapter 5: Tissues, Organs And Organ Systems', 'Chapter 5: Tissues, Organs and Organ Systems'],
  ['Chapter 10: Reproduction In Plants', 'Chapter 10: Reproduction in Plants'],
  ['Chapter 1: States Of Matter And Phase Changes', 'Chapter 1: States of Matter and Phase Changes'],
  ['Chapter 7: Acid Base Chemistry', 'Chapter 7: Acid-Base Chemistry'],
  ['Chapter 9: Group Properties & Elements', 'Chapter 9: Group Properties and Elements'],
  ['Chapter 12: Empirical Data Collection And Analysis', 'Chapter 12: Empirical Data Collection and Analysis'],
  ['Chapter 13: Laboratory And Practical Skills', 'Chapter 13: Laboratory and Practical Skills'],
  ['Chapter 1 - Introduction To Systems', 'Chapter 1: Introduction to Systems'],
  ['Chapter 2 - Number Systems', 'Chapter 2: Number Systems'],
  ['Chapter 3 - Digital Systems And Logic Design', 'Chapter 3: Digital Systems and Logic Design'],
  ['Chapter 4 - Systems Troubleshooting', 'Chapter 4: Systems Troubleshooting'],
  ['Chapter 5 - Software Systems', 'Chapter 5: Software Systems'],
  ['Chapter 6 - Introduction To Computer Networks', 'Chapter 6: Introduction to Computer Networks'],
  ['Chapter 7 - Computational Thinking', 'Chapter 7: Computational Thinking'],
  [
    'Chapter 8 - Web Development With HTML, CSS And Java-Script',
    'Chapter 8: Web Development with HTML, CSS and JavaScript',
  ],
  ['Chapter 9 - Data Science And Data Gathering', 'Chapter 9: Data Science and Data Gathering'],
  ['Chapter 10 - Emerging Techonologies In Computer Science', 'Chapter 10: Emerging Technologies in Computer Science'],
  [
    'Chapter 11 - Ethical, Social And Legal Concerns In Computer Usage',
    'Chapter 11: Ethical, Social and Legal Concerns in Computer Usage',
  ],
  ['Chapter 12 - Entrepreneurship In Digital Age', 'Chapter 12: Entrepreneurship in Digital Age'],
  ['Chapter 1: Ideological Bases Of Pakistan', 'Chapter 1: Ideological Basis of Pakistan'],
  [
    'Chapter 2: The Pakistan Movement And Emergence Of Pakistan',
    'Chapter 2: The Pakistan Movement and Emergence of Pakistan',
  ],
  ['Chapter 3: Land And Environment', 'Chapter 3: Land and Environment'],
  ["Chapter 4: Women'S Empowerment", "Chapter 4: Women's Empowerment"],
]);

function asciiTitle(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getChapterDefinition(note) {
  if (Number.isInteger(note.chapter_order) && note.chapter_order > 0 && note.chapter_label) {
    return { order: note.chapter_order, name: asciiTitle(note.chapter_label) };
  }

  const normalizedTitle = asciiTitle(note.title);
  if (note.subject_slug === 'english') {
    const section = ENGLISH_SECTIONS[normalizedTitle];
    if (!section) throw new Error(`Unmapped English Drive section: ${note.title}`);
    return section;
  }

  const label = asciiTitle(note.chapter_label || '');
  const match = label.match(/^(?:Chapter|Unit)\s+(\d+)\s*[:-]\s*(.+)$/i);
  if (!match) throw new Error(`Invalid Drive chapter label: ${note.chapter_label || note.title}`);
  return {
    order: Number(match[1]),
    name: VERIFIED_NAME_FIXES.get(label) || `Chapter ${Number(match[1])}: ${match[2]}`,
  };
}

function getChapterSlug(subjectSlug, definition) {
  return slugify(`${subjectSlug}-class-9-${definition.order}-${definition.name}`);
}

async function syncClass9DriveChapters(client, notes) {
  if (!Array.isArray(notes) || !notes.length) {
    throw new Error('Drive note catalog is empty or invalid.');
  }

  const subjectSlugs = [...new Set(notes.map((note) => note.subject_slug))];
  const { data: subjects, error: subjectError } = await client
    .from('subjects')
    .select('id, slug')
    .in('slug', subjectSlugs);
  if (subjectError) throw subjectError;
  const subjectIds = new Map((subjects || []).map((subject) => [subject.slug, subject.id]));
  const missingSubjects = subjectSlugs.filter((slug) => !subjectIds.has(slug));
  if (missingSubjects.length) throw new Error(`Missing subjects: ${missingSubjects.join(', ')}`);

  const chapterDefinitions = new Map();
  for (const note of notes) {
    const definition = getChapterDefinition(note);
    const slug = getChapterSlug(note.subject_slug, definition);
    chapterDefinitions.set(slug, { ...definition, slug, subjectSlug: note.subject_slug });
  }

  const chapterRows = [...chapterDefinitions.values()].map((chapter) => ({
    subject_id: subjectIds.get(chapter.subjectSlug),
    name: chapter.name,
    slug: chapter.slug,
    description: 'Class 9 chapter verified from the uploaded ilm AI Drive folder structure.',
    order_index: chapter.order,
    grade_levels: ['GRADE_9'],
    boards: [],
    is_active: true,
  }));
  const chapterSlugs = chapterRows.map((chapter) => chapter.slug);
  const existingChapterBySlug = new Map();
  for (let index = 0; index < chapterSlugs.length; index += 40) {
    const { data, error } = await client
      .from('chapters')
      .select('id, slug, name, order_index')
      .in('slug', chapterSlugs.slice(index, index + 40));
    if (error) throw error;
    for (const chapter of data || []) existingChapterBySlug.set(chapter.slug, chapter);
  }

  const missingChapterRows = chapterRows.filter((chapter) => !existingChapterBySlug.has(chapter.slug));
  for (let index = 0; index < missingChapterRows.length; index += 40) {
    const { error } = await client.from('chapters').insert(missingChapterRows.slice(index, index + 40));
    if (error) throw error;
  }

  for (const chapter of chapterRows) {
    const existing = existingChapterBySlug.get(chapter.slug);
    if (!existing) continue;
    const { error } = await client.from('chapters').update(chapter).eq('id', existing.id);
    if (error) throw error;
  }

  const chapterIdBySlug = new Map();
  for (let index = 0; index < chapterSlugs.length; index += 40) {
    const { data, error } = await client
      .from('chapters')
      .select('id, slug')
      .in('slug', chapterSlugs.slice(index, index + 40));
    if (error) throw error;
    for (const chapter of data || []) chapterIdBySlug.set(chapter.slug, chapter.id);
  }

  const notesByChapter = new Map();
  for (const note of notes) {
    const definition = getChapterDefinition(note);
    const slug = getChapterSlug(note.subject_slug, definition);
    const items = notesByChapter.get(slug) || [];
    items.push(note);
    notesByChapter.set(slug, items);
  }

  let linkedResources = 0;
  for (const [slug, chapterNotes] of notesByChapter) {
    const chapterId = chapterIdBySlug.get(slug);
    if (!chapterId) throw new Error(`Chapter was not created: ${slug}`);
    const { data, error } = await client
      .from('library_resources')
      .update({ chapter_id: chapterId })
      .in(
        'drive_file_id',
        chapterNotes.map((note) => note.light.id)
      )
      .select('id');
    if (error) throw error;
    linkedResources += data?.length || 0;
  }

  const targetIds = new Set(notes.map((note) => note.light.id));
  let verifiedResources = 0;
  for (let index = 0; index < notes.length; index += 40) {
    const ids = notes.slice(index, index + 40).map((note) => note.light.id);
    const { data, error } = await client
      .from('library_resources')
      .select('drive_file_id, chapter_id')
      .in('drive_file_id', ids);
    if (error) throw error;
    verifiedResources += (data || []).filter(
      (resource) => targetIds.has(resource.drive_file_id) && resource.chapter_id
    ).length;
  }
  if (verifiedResources !== notes.length) {
    throw new Error(`Chapter verification failed: ${verifiedResources}/${notes.length} notes linked.`);
  }

  const canonicalSlugs = new Set(chapterSlugs);
  const { data: gradeNineChapters, error: gradeNineChapterError } = await client
    .from('chapters')
    .select('id, slug, grade_levels, is_active')
    .in('subject_id', [...subjectIds.values()]);
  if (gradeNineChapterError) throw gradeNineChapterError;

  const legacyChapterIds = (gradeNineChapters || [])
    .filter(
      (chapter) => chapter.is_active && chapter.grade_levels?.includes('GRADE_9') && !canonicalSlugs.has(chapter.slug)
    )
    .map((chapter) => chapter.id);

  let archivedLegacyChapters = 0;
  for (let index = 0; index < legacyChapterIds.length; index += 40) {
    const { data, error } = await client
      .from('chapters')
      .update({ is_active: false })
      .in('id', legacyChapterIds.slice(index, index + 40))
      .select('id');
    if (error) throw error;
    archivedLegacyChapters += data?.length || 0;
  }

  return {
    chapters: chapterRows.length,
    linkedResources,
    verifiedResources,
    archivedLegacyChapters,
  };
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials are missing.');

  const notes = [
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-drive-notes.json'), 'utf8')),
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-math-drive-notes.json'), 'utf8')),
  ];
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await syncClass9DriveChapters(client, notes);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { getChapterDefinition, getChapterSlug, syncClass9DriveChapters };

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
