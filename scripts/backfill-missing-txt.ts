// Grade 9 and 10 are already uploaded + inserted, but the original discovery
// scripts had a txt-filename bug in several subjects (assumed the .txt sibling
// kept the "_Dark" suffix — sometimes it does, sometimes it doesn't) so ~105
// grade-10 rows and some grade-9 rows ended up with context_text_url = null
// even though the .txt file exists locally.
//
// This script does NOT upload anything (user is doing uploads manually this
// round). It reads the existing manifest JSON files (which still have the
// original `source.dark` path for every row), fuzzy-matches the sibling txt
// file for every row with context_key === null, copies matches into the
// staging folder at their would-be key path, and writes a
// `backfill-context-updates.json` listing {dark_key, context_key} pairs for
// every row it found — for a later SQL UPDATE once the user confirms upload.
//
// Usage:
//   npx tsx scripts/backfill-missing-txt.ts

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const STAGING_ROOT = 'E:/data/_ready-to-upload';

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/dark$/, '').replace(/light$/, '');
}

function findSiblingTxt(darkAbs: string): string | null {
  // txt lives in a sibling "txt" folder where the path currently says "dark"
  // (case-sensitive on Windows paths isn't an issue, but the folder segment
  // name itself may be "dark" or "Dark").
  const parts = darkAbs.split(path.sep);
  const darkIdx = parts.map((p) => p.toLowerCase()).lastIndexOf('dark');
  if (darkIdx === -1) return null;
  const txtParts = [...parts];
  txtParts[darkIdx] = 'txt';
  let txtDir = txtParts.slice(0, -1).join(path.sep);
  if (!existsSync(txtDir)) return null;
  // Some folders have an extra nested "txt/txt" level (e.g. 9th physics) —
  // if the direct dir has no .txt files but has a "txt" subfolder, descend.
  if (readdirSync(txtDir).filter((f) => /\.txt$/i.test(f)).length === 0 && existsSync(path.join(txtDir, 'txt'))) {
    txtDir = path.join(txtDir, 'txt');
  }
  const txtFiles = readdirSync(txtDir).filter((f) => /\.txt$/i.test(f));
  const darkBase = path.basename(darkAbs, '.pdf');
  const target = normalize(darkBase);
  const exact = txtFiles.find((f) => normalize(f.replace(/\.txt$/i, '')) === target);
  if (exact) return path.join(txtDir, exact);
  // fallback 1: containment match (helps when txt file dropped a descriptive
  // word the pdf has, e.g. "Ch14_Light_ShortQuestions" vs "ch14_ShortQuestions")
  const contained = txtFiles.find((f) => {
    const n = normalize(f.replace(/\.txt$/i, ''));
    return n.length > 4 && (target.includes(n) || n.includes(target));
  });
  if (contained) return path.join(txtDir, contained);
  // fallback 2: chapter number + section-kind match within the same folder
  // (handles cases where a descriptive word sits *between* the number and the
  // kind, e.g. "Ch14_Light_ShortQuestions" vs "ch14_ShortQuestions", or where
  // the pdf's embedded chapter number doesn't match the folder's — as long as
  // there's exactly one candidate of that kind, that's clearly the sibling).
  const kindOf = (s: string) => (/short/i.test(s) ? 'short' : /long/i.test(s) ? 'long' : /mcq/i.test(s) ? 'mcq' : /note/i.test(s) ? 'notes' : null);
  const numOf = (s: string) => s.match(/(\d+)/)?.[1] ?? null;
  const targetKind = kindOf(darkBase);
  const targetNum = numOf(darkBase);
  if (targetKind) {
    const sameKind = txtFiles.filter((f) => kindOf(f) === targetKind);
    const numMatch = targetNum ? sameKind.find((f) => numOf(f) === targetNum) : undefined;
    if (numMatch) return path.join(txtDir, numMatch);
    if (sameKind.length === 1) return path.join(txtDir, sameKind[0]!);
  }
  // fallback 3: no section-kind in the filename at all (kind lives in the
  // folder name instead, e.g. phy/dark/longs/Ch1_Dark.pdf) — match by chapter
  // number alone if unambiguous within this folder.
  if (targetNum) {
    const numMatches = txtFiles.filter((f) => numOf(f) === targetNum);
    if (numMatches.length === 1) return path.join(txtDir, numMatches[0]!);
  }
  return null;
}

// Grade-10 Urdu's 4 chapterless "Ch<range>_Urdu_Essays" groups map onto txt
// files named "essay-Group<N>_Content.txt" by ordinal position (verified by
// hand: 4 fixed ranges, 4 fixed group files, same order).
const URDU_ESSAY_GROUP_BY_RANGE: Record<string, number> = {
  'Ch1-9_Urdu_Essays': 1,
  'Ch10-18_Urdu_Essays': 2,
  'Ch19-27_Urdu_Essays': 3,
  'Ch28-36_Urdu_Essays': 4,
};

function findUrduEssayTxt(darkAbs: string): string | null {
  const darkBase = path.basename(darkAbs);
  const rangeKey = Object.keys(URDU_ESSAY_GROUP_BY_RANGE).find((k) => darkBase.startsWith(k));
  if (!rangeKey) return null;
  const groupNum = URDU_ESSAY_GROUP_BY_RANGE[rangeKey]!;
  const txtDir = path.join(path.dirname(darkAbs), '..', 'txt');
  if (!existsSync(txtDir)) return null;
  // Both MCQs and Notes for a group share the SAME single essay-GroupN_Content.txt
  // source file locally (one combined context file per group, verified by hand).
  const candidate = readdirSync(txtDir).find((f) => f.toLowerCase().includes(`group${groupNum}`) && f.toLowerCase().includes('content'));
  return candidate ? path.join(txtDir, candidate) : null;
}

type ManifestRow = {
  dark_key: string | null;
  light_key: string | null;
  context_key: string | null;
  source: { dark?: string; light?: string; txt?: string };
};

function contextKeyFor(darkKey: string) {
  return darkKey.replace(/\.(dark|light)\.pdf$/i, '.context.txt');
}

function main() {
  const manifests = ['9th-library-manifest.json', '10th-library-manifest.json'];
  const updates: { grade: string; dark_key: string; context_key: string }[] = [];
  let staged = 0;
  let unresolved = 0;

  for (const manifestFile of manifests) {
    if (!existsSync(manifestFile)) {
      console.log(`Skipping ${manifestFile} (not found).`);
      continue;
    }
    const grade = manifestFile.startsWith('9th') ? 'GRADE_9' : 'GRADE_10';
    const rows: ManifestRow[] = JSON.parse(require('node:fs').readFileSync(manifestFile, 'utf8'));
    const missing = rows.filter((r) => !r.context_key && r.dark_key && r.source.dark);
    console.log(`${manifestFile}: ${missing.length} rows missing context_key.`);
    for (const row of missing) {
      const txtAbs = findSiblingTxt(row.source.dark!) || findUrduEssayTxt(row.source.dark!);
      if (!txtAbs) {
        unresolved++;
        continue;
      }
      const contextKey = contextKeyFor(row.dark_key!);
      const dest = path.join(STAGING_ROOT, contextKey);
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(txtAbs, dest);
      staged++;
      updates.push({ grade, dark_key: row.dark_key!, context_key: contextKey });
    }
  }

  writeFileSync('backfill-context-updates.json', JSON.stringify(updates, null, 2));
  console.log(`Staged ${staged} txt files into ${STAGING_ROOT}. Unresolved: ${unresolved}.`);
  console.log('Update list written to backfill-context-updates.json (for the DB UPDATE once uploaded).');
}

main();
