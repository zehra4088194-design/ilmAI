import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = process.argv[2] || 'E:\\data\\uni\\D-pharm\\1st-year';
const outputRoot = process.argv[3] || 'E:\\data\\uni\\D-pharm\\1st-year-modified';
const bucket = 'ilmai-uni-bucket';
const bucketRoot = 'd-pharm/1st-year-modified';

const resourceTypeFor = (relative) => {
  const lower = relative.toLowerCase();
  const extension = path.extname(relative).toLowerCase();
  if (!['.pdf', '.docx', '.zip', '.txt'].includes(extension)) return null;
  if (lower.startsWith('past papers')) return 'past_paper';
  if (lower.includes('mcq')) return 'topic_notes';
  if (['.pdf', '.docx', '.txt'].includes(extension)) return 'topic_notes';
  return null;
};

const outputDirectoryFor = (relative) => {
  const lower = relative.toLowerCase();
  if (lower.startsWith('past papers')) return '04-past-papers';
  if (lower.includes('mcq')) return '03-question-banks';
  if (lower.endsWith('.txt')) return '02-source-text';
  return '01-topic-notes';
};

const safePath = (value) =>
  value
    .replace(/[<>:"|?*]/g, '-')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/');

const findResourcePath = (relative) => {
  const normalized = relative.replace(/\\/g, '/');
  const textDirectory = normalized.match(/\/(text|txt)\//i)?.[1];
  const lightDirectory = textDirectory?.toLowerCase() === 'txt' ? 'light' : 'Light';
  let candidate = normalized
    .replace(/\/(text|txt)\//i, `/${lightDirectory}/`)
    .replace(/_content\.txt$/i, '_Light.pdf')
    .replace(/\.txt$/i, '_Light.pdf');
  if (!fs.existsSync(path.join(sourceRoot, candidate.replace(/\//g, path.sep)))) {
    candidate = normalized
      .replace(/_content\.txt$/i, '_Light.pdf')
      .replace(/\.txt$/i, '_Light.pdf');
  }
  return safePath(path.join(outputDirectoryFor(candidate), candidate));
};

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

function parseQuestions(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const answerKey = new Map();
  const answerMatch = text.match(/answer\s+key\s*:\s*([\s\S]*)/i);
  if (answerMatch) {
    for (const match of answerMatch[1].matchAll(/(\d+)\s*[-.)]?\s*([ABCD])/gi)) {
      answerKey.set(Number(match[1]), match[2].toLowerCase());
    }
  }

  const lines = text.split('\n');
  const questions = [];
  let current = null;
  let option = null;
  const flush = () => {
    if (!current || !current.options.a || !current.options.b) return;
    const correct = answerKey.get(current.number) || current.inlineAnswer;
    if (!correct) return;
    questions.push({
      number: current.number,
      text: current.text.trim(),
      options: ['a', 'b', 'c', 'd']
        .filter((id) => current.options[id])
        .map((id) => ({ id, text: current.options[id].trim() })),
      correct,
    });
  };

  for (const line of lines) {
    const questionMatch = line.match(/^\s*(\d+)[.)]\s+(.+?)\s*$/);
    const optionMatch = line.match(/^\s*([ABCD])[.)]\s+(.+?)\s*$/i);
    const answerLine = line.match(/^\s*(?:answer|correct\s+answer)\s*[:\-]\s*([ABCD])\b/i);
    if (questionMatch) {
      flush();
      current = { number: Number(questionMatch[1]), text: questionMatch[2], options: {}, inlineAnswer: null };
      option = null;
    } else if (optionMatch && current) {
      option = optionMatch[1].toLowerCase();
      current.options[option] = optionMatch[2];
    } else if (answerLine && current) {
      current.inlineAnswer = answerLine[1].toLowerCase();
    } else if (current && option) {
      current.options[option] += ` ${line.trim()}`;
    } else if (current && line.trim() && !/^answer\s+key/i.test(line.trim())) {
      current.text += ` ${line.trim()}`;
    }
  }
  flush();
  return questions;
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const resources = [];
const questions = [];
const textContents = [];
for (const fullPath of walk(sourceRoot)) {
  const relative = path.relative(sourceRoot, fullPath);
  const extension = path.extname(relative).toLowerCase();
  const outputDirectory = outputDirectoryFor(relative);
  const destinationRelative = safePath(path.join(outputDirectory, relative));
  const destination = path.join(outputRoot, destinationRelative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(fullPath, destination);

  const storagePath = `${bucketRoot}/${destinationRelative}`;
  if (extension === '.txt') {
    const content = fs.readFileSync(fullPath, 'utf8');
    const textStoragePath = `${bucketRoot}/${destinationRelative}`;
    textContents.push({ source: relative, storagePath: textStoragePath, content });
    const extracted = parseQuestions(content);
    questions.push(...extracted.map((question) => ({
      ...question,
      source: relative,
      resourcePath: textStoragePath,
    })));
  }
  const resourceType = resourceTypeFor(relative);
  if (resourceType) {
    resources.push({
      title: path.basename(relative),
      source: relative,
      resourceType,
      storagePath,
    });
  }
}

const manifest = {
  bucket,
  bucketRoot,
  program: 'D-Pharm',
  year: '1st Professional Year',
  subject: 'Organic Chemistry',
  resources,
  questionCount: questions.length,
  textSources: [...new Set(questions.map((question) => question.source))],
};
fs.writeFileSync(path.join(outputRoot, '00-MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const resourceSql = resources
  .map(
    (resource) =>
      `  insert into public.university_subject_resources (subject_id, resource_type, title, url)\n` +
      `  values (v_subject_id, ${sqlString(resource.resourceType)}, ${sqlString(resource.title)}, ${sqlString(`r2://${bucket}/${resource.storagePath}`)})\n` +
      `  on conflict do nothing;`
  )
  .join('\n');

const questionSql = questions
  .map(
    (question) =>
      `  insert into public.university_questions (subject_id, resource_id, text, options, correct_answer, explanation, difficulty, marks)\n` +
      `  values (v_subject_id, (select id from public.university_subject_resources where subject_id = v_subject_id and url = ${sqlString(`r2://${bucket}/${question.resourcePath}`)} limit 1), ${sqlString(question.text)}, ${sqlString(JSON.stringify(question.options))}::jsonb, ${sqlString(JSON.stringify(question.correct))}::jsonb, ${sqlString(`Imported from ${question.source} (question ${question.number}).`)}, 'MEDIUM', 1);`
  )
  .join('\n');

const contentSql = textContents
  .map(
    (item) =>
      `  insert into public.university_resource_contents (resource_id, content, source_path)\n` +
      `  select id, ${sqlString(item.content)}, ${sqlString(item.source)}\n` +
      `  from public.university_subject_resources\n` +
      `  where subject_id = v_subject_id and url = ${sqlString(`r2://${bucket}/${item.storagePath}`)}\n` +
      `  on conflict (resource_id) do update set content = excluded.content, source_path = excluded.source_path, updated_at = now();`
  )
  .join('\n');

const sql = `-- Generated by scripts/prepare-dpharm-university-import.mjs
-- Upload the contents of this folder to the bucket while preserving paths:
-- ${bucket}/
-- Then run this file in Supabase SQL Editor.
do $$
declare
  v_program_id uuid;
  v_year_id uuid;
  v_subject_id uuid;
begin
  select id into v_program_id
  from public.university_degree_programs
  where lower(slug) in ('d-pharm', 'dpharm', 'pharm-d')
     or lower(name) like '%pharm%'
  order by case when lower(slug) = 'd-pharm' then 0 else 1 end
  limit 1;
  if v_program_id is null then raise exception 'D-Pharm program not found'; end if;

  select id into v_year_id
  from public.university_program_years
  where program_id = v_program_id and (year_number = 1 or lower(label) like '%1st%')
  order by year_number
  limit 1;
  if v_year_id is null then raise exception 'D-Pharm 1st year not found'; end if;

  select id into v_subject_id
  from public.university_subjects
  where lower(name) = 'organic chemistry'
  limit 1;
  if v_subject_id is null then
    insert into public.university_subjects (name) values ('Organic Chemistry') returning id into v_subject_id;
  end if;
  insert into public.university_program_year_subjects (program_year_id, subject_id)
  values (v_year_id, v_subject_id) on conflict do nothing;

${resourceSql}

${contentSql}

${questionSql}
end $$;
`;
fs.writeFileSync(path.join(outputRoot, '05-import-dpharm-organic-chemistry.sql'), sql);
console.log(`Prepared ${resources.length} resources and ${questions.length} questions in ${outputRoot}`);
