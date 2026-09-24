import 'server-only';

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_KNOWLEDGE_ROOT = path.join(process.cwd(), 'data', 'tutor-knowledge');
const MAX_FILES = 8;
const MAX_FILE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 14_000;

type SubjectTutorInput = {
  subjectId?: string | null;
  subjectName?: string | null;
  query: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function safeExists(directory: string) {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function listTextFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTextFiles(fullPath)));
    } else if (/\.(txt|md)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scoreFile(filePath: string, text: string, query: string) {
  const haystack = `${filePath}\n${text.slice(0, 1_500)}`.toLowerCase();
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length >= 4);
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function trimForTutor(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_FILE_CHARS);
}

/**
 * Loads Claude-prepared subject/topic knowledge files for the local tutor.
 *
 * Important boundary: this does NOT read PDF companion TXT resources from
 * library_resources. Those files remain for per-resource summaries/tests only.
 */
export async function buildSubjectTutorContext({ subjectId, subjectName, query }: SubjectTutorInput) {
  const knowledgeRoot = process.env.TUTOR_KNOWLEDGE_PATH || DEFAULT_KNOWLEDGE_ROOT;
  const subjectKeys = [subjectName ? slugify(subjectName) : null, subjectId ? slugify(subjectId) : null].filter(
    Boolean
  ) as string[];
  if (!subjectKeys.length) return null;

  let resolvedDirectory: string | null = null;
  for (const key of subjectKeys) {
    const candidate = path.join(knowledgeRoot, key);
    if (await safeExists(candidate)) {
      resolvedDirectory = candidate;
      break;
    }
  }
  if (!resolvedDirectory) return null;

  const filePaths = await listTextFiles(resolvedDirectory);
  const scoredFiles = [];
  for (const filePath of filePaths) {
    const raw = await readFile(filePath, 'utf8').catch(() => '');
    const text = trimForTutor(raw);
    if (text.length < 80) continue;
    scoredFiles.push({ filePath, text, score: scoreFile(filePath, text, query) });
  }

  const selected = scoredFiles
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath))
    .slice(0, MAX_FILES)
    .map((file) => {
      const label = path.relative(resolvedDirectory!, file.filePath).replace(/\\/g, '/');
      return `[Tutor knowledge: ${label}]\n${file.text}`;
    })
    .join('\n\n');

  return selected.slice(0, MAX_TOTAL_CHARS).trim() || null;
}
