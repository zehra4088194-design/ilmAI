const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getChapterDefinition, getChapterSlug } = require('./sync-class9-drive-chapters');

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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchDriveText(fileId) {
  const encodedId = encodeURIComponent(fileId);
  const endpoints = [
    `https://drive.usercontent.google.com/download?id=${encodedId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodedId}`,
  ];
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          redirect: 'follow',
          headers: { accept: 'text/plain', 'user-agent': 'ilm-ai-diagnostic-importer/1.0' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Drive text fetch failed (${response.status}).`);
        const text = await response.text();
        if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text)) {
          throw new Error('Drive returned an HTML permission or rate-limit page.');
        }
        return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      } catch (error) {
        lastError = error;
      }
    }
    await sleep(750 * (attempt + 1));
  }

  throw lastError || new Error('Drive text fetch failed.');
}

function parseStructuredMcqs(source) {
  const answerKey = new Map();
  const answerKeyMatches = [...source.matchAll(/^\s*(?:[|i]\s*)?ANSWER\s+KEY\s*:?\s*$/gim)];
  const answerKeyMatch = answerKeyMatches.at(-1) || null;
  if (answerKeyMatch) {
    const keyText = source.slice(answerKeyMatch.index).split(/\n\s*EXPLANATIONS?\b/i)[0];
    for (const match of keyText.matchAll(/\b(\d{1,2})\s*[.:-]\s*\(?([A-D])\)?\b/gi)) {
      answerKey.set(Number(match[1]), match[2].toUpperCase());
    }
    const lines = keyText.split('\n');
    for (let index = 0; index < lines.length - 1; index += 1) {
      const numbers = lines[index].match(/\b\d{1,2}\b/g) || [];
      const letters = lines[index + 1].match(/\b[A-D]\b/gi) || [];
      if (numbers.length < 2 || numbers.length !== letters.length) continue;
      numbers.forEach((number, answerIndex) => answerKey.set(Number(number), letters[answerIndex].toUpperCase()));
    }
  }

  const questionArea = answerKeyMatch ? source.slice(0, answerKeyMatch.index) : source;
  const pattern = /(?:^|\n)\s*(?:Q\s*)?(\d{1,2})\s*[.)]\s*([\s\S]*?)(?=\n\s*(?:Q\s*)?\d{1,2}\s*[.)]\s|$)/gi;
  const questions = [];
  for (const match of questionArea.matchAll(pattern)) {
    const number = Number(match[1]);
    const block = match[2];
    const optionPattern = /^\s*(?:\(([A-D])\)|([A-D])[.)])\s*(.+?)\s*$/gim;
    const optionMatches = [...block.matchAll(optionPattern)];
    if (optionMatches.length !== 4) continue;
    const questionText = block.slice(0, optionMatches[0].index).trim();
    const markedOption = optionMatches.find((option) => /<--\s*Answer/i.test(option[3]) || /^\s*\*/.test(option[3]));
    const inlineAnswer = block.match(
      /^\s*(?:Correct\s+)?Answer\s*:\s*\(?([A-D])\)?\b(?:\s*[.\u2013\u2014-]+\s*(.+))?/im
    );
    const answerLetter = (
      inlineAnswer?.[1] ||
      (markedOption ? markedOption[1] || markedOption[2] : null) ||
      answerKey.get(number) ||
      ''
    ).toUpperCase();
    if (!answerLetter) continue;
    const correct = answerLetter.charCodeAt(0) - 65;
    const options = optionMatches.map((option) =>
      option[3]
        .replace(/^\s*\*\s*/, '')
        .replace(/\s*<--\s*Answer\s*$/i, '')
        .trim()
    );
    questions.push({
      text: questionText,
      options,
      correct,
      explanation:
        inlineAnswer?.[2]?.trim() ||
        `The companion source marks option ${answerLetter} (${options[correct]}) as correct.`,
    });
  }
  return questions.slice(0, 30);
}

function normalizeOcrAnswer(token) {
  const value = token.replace(/[^a-z]/gi, '').toUpperCase();
  if (value === 'A' || value === 'B' || value === 'D') return value;
  if (value.includes('C') || value === 'S' || value === 'IC') return 'C';
  return null;
}

function parseOcrAnswerKey(keyText) {
  const answerKey = new Map();
  const lines = keyText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isOcrBoilerplate(line));
  for (let index = 0; index < lines.length - 1; index += 1) {
    const numbers = lines[index].match(/\b\d{1,3}\b/g) || [];
    if (numbers.length < 2) continue;
    const answers = lines[index + 1].split(/\s+/).map(normalizeOcrAnswer);
    if (answers.length !== numbers.length) continue;
    numbers.forEach((number, answerIndex) => {
      if (answers[answerIndex]) answerKey.set(Number(number), answers[answerIndex]);
    });
  }
  return answerKey;
}

function isOcrBoilerplate(line) {
  return (
    /^={3,}/.test(line) ||
    /^-{3,}\s*Page/i.test(line) ||
    /^www\.\s*ilmai\.study\s*$/i.test(line) ||
    /^ILM\s+A[IL]\s+STUDY(?:\s+-\s+Page(?:\s+\d+\s+of\s+\d+)?)?\s*$/i.test(line) ||
    /^A[IL1]\s+students\.?$/i.test(line) ||
    /^Class\s+9\b.*\b(?:Exercise|MCQs?)\b/i.test(line) ||
    /^Unit\s+\d+\s*:\s*[^?]+$/i.test(line) ||
    /prepared\s+for\s+Ilm\s+A[IL]\s+students/i.test(line) ||
    /MULTIPLE\s+CHOICE\s+QUESTIONS/i.test(line) ||
    /\banswer key included\.?$/i.test(line) ||
    /^Want more subject notes\??$/i.test(line) ||
    /^Report a mistake:/i.test(line)
  );
}

function parseOcrTableMcqs(source) {
  const keyMatches = [...source.matchAll(/^\s*(?:[|i]\s*)?ANSWER\s+KEY\s*:?\s*$/gim)];
  const keyMarker = keyMatches.at(-1);
  if (!keyMarker) return [];
  const answerKey = parseOcrAnswerKey(source.slice(keyMarker.index));
  if (!answerKey.size) return [];

  const questions = [];
  const questionBuffer = [];
  let completedGroups = 0;
  let active = null;
  for (const rawLine of source.slice(0, keyMarker.index).split('\n')) {
    const line = rawLine.trim();
    if (!line || isOcrBoilerplate(line)) continue;
    const optionMatch = line.match(/^(A|B|D|C(?:C)?)\s*[.)]\s*(.+)$/i);
    if (!optionMatch) {
      if (active && active.options.length > 0 && active.options.length < 4) {
        const lastIndex = active.options.length - 1;
        active.options[lastIndex] = `${active.options[lastIndex]} ${line}`.trim();
      } else {
        questionBuffer.push(line);
      }
      continue;
    }

    const letter = optionMatch[1][0].toUpperCase();
    if (letter === 'A') {
      active = {
        text: questionBuffer.splice(0).join(' ').trim(),
        options: [optionMatch[2].trim()],
      };
      continue;
    }
    const expected = active ? String.fromCharCode(65 + active.options.length) : '';
    if (!active || letter !== expected) {
      questionBuffer.push(line);
      active = null;
      continue;
    }
    active.options.push(optionMatch[2].trim());
    if (letter !== 'D') continue;

    const number = ++completedGroups;
    const answerLetter = answerKey.get(number);
    if (active.text && answerLetter) {
      const correct = answerLetter.charCodeAt(0) - 65;
      questions.push({
        text: active.text.replace(/^[^a-z0-9]*(?:\d{1,3})?[^a-z0-9]*/i, '').trim(),
        options: active.options,
        correct,
        explanation: `The OCR companion answer key marks option ${answerLetter} as correct.`,
        verified: false,
      });
    }
    active = null;
  }
  return questions.slice(0, 30);
}

function parseDriveMcqs(source) {
  const structured = parseStructuredMcqs(source);
  return structured.length >= 5 ? structured : parseOcrTableMcqs(source);
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials are missing.');

  const notes = [
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-drive-notes.json'), 'utf8')),
    ...JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'class9-math-drive-notes.json'), 'utf8')),
  ].filter((note) => (note.content_section === 'mcq' || /\bmcqs?\b/i.test(note.title)) && note.text?.id);
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const subjectSlugs = [...new Set(notes.map((note) => note.subject_slug))];
  const { data: subjects, error: subjectError } = await client
    .from('subjects')
    .select('id, slug')
    .in('slug', subjectSlugs);
  if (subjectError) throw subjectError;
  const subjectIds = new Map((subjects || []).map((subject) => [subject.slug, subject.id]));
  const missingSubjects = subjectSlugs.filter((slug) => !subjectIds.has(slug));
  if (missingSubjects.length) throw new Error(`Missing subjects: ${missingSubjects.join(', ')}`);

  const chapterSlugs = [...new Set(notes.map((note) => getChapterSlug(note.subject_slug, getChapterDefinition(note))))];
  const chapterIds = new Map();
  for (let index = 0; index < chapterSlugs.length; index += 40) {
    const { data: chapters, error: chapterError } = await client
      .from('chapters')
      .select('id, slug')
      .in('slug', chapterSlugs.slice(index, index + 40));
    if (chapterError) throw chapterError;
    for (const chapter of chapters || []) chapterIds.set(chapter.slug, chapter.id);
  }

  let imported = 0;
  let skipped = 0;
  let fetchFailed = 0;
  let reviewRequired = 0;
  const bySubject = {};
  for (const note of notes) {
    const chapterSlug = getChapterSlug(note.subject_slug, getChapterDefinition(note));
    const chapterId = chapterIds.get(chapterSlug);
    if (!chapterId) throw new Error(`Missing chapter for ${note.title}. Run db:seed-library first.`);
    const sourceTag = `drive-file:${note.text.id}`;

    let source;
    try {
      source = await fetchDriveText(note.text.id);
    } catch (error) {
      console.warn(`Skipped ${note.title}: ${error instanceof Error ? error.message : error}`);
      skipped += 1;
      fetchFailed += 1;
      continue;
    }
    const parsed = parseDriveMcqs(source);
    if (parsed.length < 5) {
      const { error: deleteError } = await client.from('questions').delete().contains('tags', [sourceTag]);
      if (deleteError) throw deleteError;
      console.warn(`Skipped ${note.title}: only ${parsed.length} structured MCQs were parsed.`);
      skipped += 1;
      continue;
    }

    const { error: deleteError } = await client.from('questions').delete().contains('tags', [sourceTag]);
    if (deleteError) throw deleteError;
    const rows = parsed.map((question) => ({
      subject_id: subjectIds.get(note.subject_slug),
      chapter_id: chapterId,
      topic_id: null,
      type: 'MCQ',
      text: question.text,
      options: Object.fromEntries(question.options.map((option, index) => [String.fromCharCode(97 + index), option])),
      correct_answer: String.fromCharCode(97 + question.correct),
      explanation: question.explanation,
      difficulty: 'MEDIUM',
      marks: 1,
      board: null,
      is_verified: question.verified !== false,
      is_demo_eligible: false,
      tags: ['drive-import', 'class-9', question.verified === false ? 'review-required' : 'source-verified', sourceTag],
    }));
    const { error: insertError } = await client.from('questions').insert(rows);
    if (insertError) throw insertError;
    imported += rows.length;
    const reviewRows = parsed.filter((question) => question.verified === false).length;
    reviewRequired += reviewRows;
    bySubject[note.subject_slug] = (bySubject[note.subject_slug] || 0) + rows.length;
    await sleep(150);
  }

  console.log(
    JSON.stringify({ files: notes.length, imported, reviewRequired, skipped, fetchFailed, bySubject }, null, 2)
  );
}

module.exports = { parseDriveMcqs, parseOcrTableMcqs, parseStructuredMcqs };

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
