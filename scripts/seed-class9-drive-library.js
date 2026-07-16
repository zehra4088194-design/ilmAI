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

function extractDriveId(value) {
  if (!value) return null;
  return value.match(/\/file\/d\/([^/?#]+)/i)?.[1] || value.match(/[?&]id=([^&#]+)/i)?.[1] || null;
}

const textbooks = [
  {
    title: 'Class 9 English Textbook (Punjab)',
    subject_slug: 'english',
    id: '1g4fNH_2XEf2VSSnIq7L2To4EmEzSRyib',
    url: 'https://drive.google.com/file/d/1g4fNH_2XEf2VSSnIq7L2To4EmEzSRyib/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Computer Science Textbook (Punjab)',
    subject_slug: 'computer-science',
    id: '1SLH7hhBIRQTuwG4J0ehoqqMOIrny-_5k',
    url: 'https://drive.google.com/file/d/1SLH7hhBIRQTuwG4J0ehoqqMOIrny-_5k/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Biology Textbook (Punjab)',
    subject_slug: 'biology',
    id: '153dBjdr8jOEOCrtVXa5juOiiQ8g1NG2f',
    url: 'https://drive.google.com/file/d/153dBjdr8jOEOCrtVXa5juOiiQ8g1NG2f/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Urdu Textbook (Punjab)',
    subject_slug: 'urdu',
    id: '1xwIdW06CpzTBduAvu2EuVOVOLykqNAO7',
    url: 'https://drive.google.com/file/d/1xwIdW06CpzTBduAvu2EuVOVOLykqNAO7/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Mathematics Textbook (Punjab)',
    subject_slug: 'mathematics',
    id: '12rouZP8shQtH5Lh1QGGNoSWKen50cUqv',
    url: 'https://drive.google.com/file/d/12rouZP8shQtH5Lh1QGGNoSWKen50cUqv/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Islamiat Textbook (Punjab)',
    subject_slug: 'islamiat',
    id: '1pFL56XsuCf-SWUnL8ObatYuHUSGJd3tC',
    url: 'https://drive.google.com/file/d/1pFL56XsuCf-SWUnL8ObatYuHUSGJd3tC/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Physics Textbook (Punjab)',
    subject_slug: 'physics',
    id: '14WxsjO-r8b5omS3U2wn-9zhNohzN5HJ9',
    url: 'https://drive.google.com/file/d/14WxsjO-r8b5omS3U2wn-9zhNohzN5HJ9/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Tarjma-tul-Quran Textbook (Punjab)',
    subject_slug: null,
    id: '1jbYcQWFGb4-exSJupZIKih4dquiydisl',
    url: 'https://drive.google.com/file/d/1jbYcQWFGb4-exSJupZIKih4dquiydisl/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Chemistry Textbook (Punjab)',
    subject_slug: 'chemistry',
    id: '1f5L-AiQVT85fOanCL4780CzsUkyP2yTC',
    url: 'https://drive.google.com/file/d/1f5L-AiQVT85fOanCL4780CzsUkyP2yTC/view?usp=drivesdk',
  },
  {
    title: 'Class 9 Pakistan Studies Textbook (Punjab)',
    subject_slug: 'pakistan-studies',
    id: '1vsL6AoVzJzHW8WAlxgfnrkBOZMui6jqb',
    url: 'https://drive.google.com/file/d/1vsL6AoVzJzHW8WAlxgfnrkBOZMui6jqb/view?usp=drivesdk',
  },
];

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials are missing.');

  const notes = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-drive-notes.json'), 'utf8'));
  if (!Array.isArray(notes) || notes.length !== 139) {
    throw new Error(`Expected 139 paired notes, received ${Array.isArray(notes) ? notes.length : 'invalid data'}.`);
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const subjectSlugs = [
    ...new Set(
      [...textbooks.map((book) => book.subject_slug), ...notes.map((note) => note.subject_slug)].filter(Boolean)
    ),
  ];
  const { data: subjects, error: subjectError } = await client
    .from('subjects')
    .select('id, slug')
    .in('slug', subjectSlugs);
  if (subjectError) throw subjectError;
  const subjectIds = new Map((subjects || []).map((subject) => [subject.slug, subject.id]));
  const missingSubjects = subjectSlugs.filter((slug) => !subjectIds.has(slug));
  if (missingSubjects.length) throw new Error(`Missing subjects: ${missingSubjects.join(', ')}`);

  const bookRows = textbooks.map((book) => ({
    title: book.title,
    description: 'Punjab Textbook Board — Class 9 complete textbook (light PDF).',
    category: 'local',
    resource_type: 'text_book',
    subject_id: book.subject_slug ? subjectIds.get(book.subject_slug) : null,
    chapter_id: null,
    board: null,
    grade_level: 'GRADE_9',
    drive_url: book.url,
    drive_file_id: book.id,
    thumbnail_url: null,
    light_file_url: book.url,
    dark_file_url: null,
    context_text_url: null,
    file_type: 'pdf',
    added_by: null,
  }));

  const noteRows = notes.map((note) => ({
    title: note.title,
    description: note.description,
    category: 'local',
    resource_type: 'notes',
    subject_id: subjectIds.get(note.subject_slug),
    chapter_id: null,
    board: null,
    grade_level: 'GRADE_9',
    drive_url: note.light.url,
    drive_file_id: note.light.id,
    thumbnail_url: null,
    light_file_url: note.light.url,
    dark_file_url: note.dark.url,
    context_text_url: note.text.url,
    file_type: 'pdf',
    added_by: null,
  }));

  const desiredRows = [...bookRows, ...noteRows];
  const desiredIds = new Set(desiredRows.map((row) => row.drive_file_id));
  if (desiredIds.size !== desiredRows.length) throw new Error('Duplicate light PDF IDs found in seed data.');

  const { data: existing, error: existingError } = await client
    .from('library_resources')
    .select('drive_file_id, drive_url, light_file_url');
  if (existingError) throw existingError;
  const existingIds = new Set();
  for (const resource of existing || []) {
    for (const value of [resource.drive_file_id, resource.drive_url, resource.light_file_url]) {
      const id = value && !value.includes('/') ? value : extractDriveId(value);
      if (id) existingIds.add(id);
    }
  }

  const missingRows = desiredRows.filter((row) => !existingIds.has(row.drive_file_id));
  const inserted = [];
  for (let index = 0; index < missingRows.length; index += 40) {
    const chunk = missingRows.slice(index, index + 40);
    const { data, error } = await client
      .from('library_resources')
      .insert(chunk)
      .select('id, title, resource_type, drive_file_id');
    if (error) throw error;
    inserted.push(...(data || []));
  }

  const { data: verified, error: verifyError } = await client
    .from('library_resources')
    .select('id, title, resource_type, drive_file_id, light_file_url, dark_file_url, context_text_url')
    .eq('grade_level', 'GRADE_9');
  if (verifyError) throw verifyError;
  const verifiedTargets = (verified || []).filter((row) => desiredIds.has(row.drive_file_id));
  const verifiedNotes = verifiedTargets.filter(
    (row) => row.resource_type === 'notes' && row.light_file_url && row.dark_file_url && row.context_text_url
  );
  const verifiedBooks = verifiedTargets.filter(
    (row) => row.resource_type === 'text_book' && row.light_file_url && !row.dark_file_url
  );
  if (verifiedNotes.length !== noteRows.length || verifiedBooks.length !== bookRows.length) {
    throw new Error(
      `Verification failed: ${verifiedBooks.length}/${bookRows.length} books, ${verifiedNotes.length}/${noteRows.length} notes.`
    );
  }

  console.log(
    JSON.stringify(
      {
        inserted: inserted.length,
        skippedExisting: desiredRows.length - missingRows.length,
        verifiedTextbooks: verifiedBooks.length,
        verifiedNotes: verifiedNotes.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
