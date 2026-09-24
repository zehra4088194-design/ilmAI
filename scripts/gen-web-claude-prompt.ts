// Generates a "Part 2" web-Claude prompt (title <-> local .txt file map + Supabase
// resource_mcq_sets seeding instructions) for a given grade's manifest file(s).
// Usage: npx tsx scripts/gen-web-claude-prompt.ts <GRADE_LABEL> <out.txt> <manifest1.json> [manifest2.json ...]
import { readFileSync, writeFileSync } from 'node:fs';

type Row = {
  title: string;
  content_section: string;
  source?: { txt?: string };
};

function main() {
  const [gradeLabel, outPath, ...manifestPaths] = process.argv.slice(2);
  if (!gradeLabel || !outPath || manifestPaths.length === 0) {
    console.error('Usage: gen-web-claude-prompt.ts <GRADE_LABEL> <out.txt> <manifest.json...>');
    process.exit(1);
  }

  const rows: Row[] = manifestPaths.flatMap((p) => JSON.parse(readFileSync(p, 'utf8')));
  const withQuestions = rows.filter((r) => ['mcq', 'short', 'long'].includes(r.content_section) && r.source?.txt);
  const skippedNoTxt = rows.filter((r) => ['mcq', 'short', 'long'].includes(r.content_section) && !r.source?.txt);

  const lines: string[] = [];
  lines.push(`You have the Supabase MCP tools connected. This is a single task for the`);
  lines.push(`"ilm AI" Supabase project — seeding the EXACT question bank for ${gradeLabel}'s`);
  lines.push(`library resources. The metadata rows are ALREADY inserted into`);
  lines.push(`public.library_resources (done separately) — you do NOT insert/modify that`);
  lines.push(`table or touch any storage bucket. You ONLY write to public.resource_mcq_sets.`);
  lines.push(``);
  lines.push(`I am attaching .txt files in this chat — each one is the full, already-`);
  lines.push(`extracted verbatim text of one resource's content (same content as the PDF,`);
  lines.push(`just pre-extracted so you don't need OCR). The list below maps each resource's`);
  lines.push(`EXACT title (as already in library_resources) to which attached filename it`);
  lines.push(`corresponds to — match strictly by filename, don't guess if a file is ambiguous.`);
  lines.push(``);
  lines.push(`For EACH attached .txt file:`);
  lines.push(``);
  lines.push(`1. Find the resource row: \`select id, title, subject_id, chapter_id, grade_level`);
  lines.push(`   from public.library_resources where title = '<exact title from the list below>'`);
  lines.push(`   and grade_level = '${gradeLabel}'\`. If no exact match, search more loosely`);
  lines.push(`   (ilike '%...%') and confirm with me before proceeding — don't guess which row`);
  lines.push(`   it belongs to.`);
  lines.push(`2. Read the attached .txt file fully and transcribe its questions **verbatim**`);
  lines.push(`   — this is not AI-generated content, every question must come word-for-word`);
  lines.push(`   from the file:`);
  lines.push(`   - MCQs: { q, opts: [4 options], correct: <0-3 index>, exp } — correct index`);
  lines.push(`     and exp (explanation) must come from what's actually answer-keyed in the`);
  lines.push(`     file. If no answer key exists for an MCQ, drop that MCQ rather than`);
  lines.push(`     guessing the answer.`);
  lines.push(`   - Short questions: { q, marks, keyPoints: [...], modelAnswer } — marks only`);
  lines.push(`     if stated in the file.`);
  lines.push(`   - Long questions: same shape as short, typically higher marks.`);
  lines.push(`   A file only contains ONE of these three types (matching its resource's`);
  lines.push(`   content_section) — don't invent the other two arrays, leave them empty.`);
  lines.push(`3. Upsert into public.resource_mcq_sets:`);
  lines.push('   ```sql');
  lines.push(`   insert into public.resource_mcq_sets`);
  lines.push(`     (resource_kind, resource_id, questions, short_questions, long_questions, status, generated_at, updated_at)`);
  lines.push(`   values`);
  lines.push(`     ('library', '<library_resources.id from step 1>', '<questions jsonb>'::jsonb, '<short jsonb>'::jsonb, '<long jsonb>'::jsonb, 'ready', now(), now())`);
  lines.push(`   on conflict (resource_kind, resource_id) do update set`);
  lines.push(`     questions = excluded.questions,`);
  lines.push(`     short_questions = excluded.short_questions,`);
  lines.push(`     long_questions = excluded.long_questions,`);
  lines.push(`     status = 'ready',`);
  lines.push(`     generated_at = now(),`);
  lines.push(`     updated_at = now();`);
  lines.push('   ```');
  lines.push(`   Do NOT touch resource_processing_jobs or library_resources.drive_url in this`);
  lines.push(`   task.`);
  lines.push(`4. Move to the next attached file. Repeat for all attached files in this chat`);
  lines.push(`   (I may send them across several messages if there are too many for one).`);
  lines.push(``);
  lines.push(`After each batch of attachments, report: resource title + id you attached it`);
  lines.push(`to, MCQ/short/long counts, and anything you skipped (no answer key, unreadable`);
  lines.push(`file, couldn't find a matching resource row).`);
  lines.push(``);
  lines.push(`Total files to seed: ${withQuestions.length}.`);
  if (skippedNoTxt.length) {
    lines.push(`(${skippedNoTxt.length} MCQ/short/long resources have no local .txt source and`);
    lines.push(`are NOT included below — skip those, don't guess their content.)`);
  }
  lines.push(``);
  lines.push(`TITLE <-> ATTACHED FILENAME MAP (attach the file matching each — filenames below`);
  lines.push(`are the ORIGINAL local names; keep the same filename when attaching):`);
  lines.push(``);
  for (const r of withQuestions) {
    lines.push(`${r.title}  =>  ${r.source!.txt}`);
  }

  writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`Wrote ${outPath}: ${withQuestions.length} files to seed, ${skippedNoTxt.length} skipped (no .txt).`);
}

main();
