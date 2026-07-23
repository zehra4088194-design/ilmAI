const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getChapterSlug, syncClass9DriveChapters } = require('./sync-class9-drive-chapters');

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

function getYouTubeId(url) {
  const match = String(url || '').match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function getThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

async function ensureChapter(client, subject, lecture) {
  const definition = { order: lecture.chapter_order, name: lecture.chapter_name };
  const slug = getChapterSlug(lecture.subject_slug, definition);
  const { data: existing, error: existingError } = await client
    .from('chapters')
    .select('id')
    .eq('subject_id', subject.id)
    .eq('slug', slug)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data, error } = await client
    .from('chapters')
    .insert({
      subject_id: subject.id,
      name: lecture.chapter_name,
      slug,
      description: 'Class 9 lecture chapter added from the verified lecture catalog.',
      order_index: lecture.chapter_order,
      grade_levels: ['GRADE_9'],
      boards: [],
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials are missing.');

  const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-lecture-resources.json'), 'utf8'));
  const driveNotes = [
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-drive-notes.json'), 'utf8')),
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-math-drive-notes.json'), 'utf8')),
  ];
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await syncClass9DriveChapters(client, driveNotes);

  const subjectSlugs = [...new Set(lectures.map((lecture) => lecture.subject_slug))];
  const { data: subjects, error: subjectError } = await client
    .from('subjects')
    .select('id, slug')
    .in('slug', subjectSlugs);
  if (subjectError) throw subjectError;
  const subjectBySlug = new Map((subjects || []).map((subject) => [subject.slug, subject]));

  const missingSubjects = subjectSlugs.filter((slug) => !subjectBySlug.has(slug));
  if (missingSubjects.length) throw new Error(`Missing subjects: ${missingSubjects.join(', ')}`);

  const { data: existingLectures, error: lectureLoadError } = await client
    .from('lectures')
    .select('id, youtube_url, chapter_id')
    .in(
      'youtube_url',
      lectures.flatMap((lecture) => [lecture.youtube_url, ...(lecture.legacy_youtube_urls || [])])
    );
  if (lectureLoadError) throw lectureLoadError;
  const existingByUrl = new Map((existingLectures || []).map((lecture) => [lecture.youtube_url, lecture]));

  const rows = [];
  let updated = 0;
  for (const lecture of lectures) {
    if (!getYouTubeId(lecture.youtube_url)) continue;
    const subject = subjectBySlug.get(lecture.subject_slug);
    const chapterId = await ensureChapter(client, subject, lecture);
    const row = {
      chapter_id: chapterId,
      title: lecture.title,
      youtube_url: lecture.youtube_url,
      thumbnail_url: getThumbnail(lecture.youtube_url),
      kind: 'lecture',
      exercise_number: null,
      order_index: lecture.order_index || 0,
    };
    const existing =
      existingByUrl.get(lecture.youtube_url) ||
      (lecture.legacy_youtube_urls || []).map((url) => existingByUrl.get(url)).find(Boolean);
    if (existing) {
      const { error } = await client.from('lectures').update(row).eq('id', existing.id);
      if (error) throw error;
      updated += 1;
    } else {
      rows.push(row);
    }
  }

  if (rows.length) {
    const { error } = await client.from('lectures').insert(rows);
    if (error) throw error;
  }

  console.log(JSON.stringify({ inserted: rows.length, updated }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
