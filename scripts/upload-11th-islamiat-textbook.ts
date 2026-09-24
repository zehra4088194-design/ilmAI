import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { putR2Object } from '../src/lib/storage/r2';

async function main() {
  const key = 'library/text-books/grade-11/islamiat-full-textbook.pdf';
  const source = 'E:/data/11th/text_books/New 11 Islamiat UM Full Book Punjab 2025.pdf';
  await putR2Object(key, readFileSync(source), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET);
  console.log('uploaded', key);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const url = `r2://${process.env.SECONDARY_STORAGE_BUCKET}/${key}`;
  const { error } = await supabase.from('library_resources').insert({
    title: 'Islamiat — Class 11 Full Textbook (Punjab)',
    subject_id: 'dafd0504-d665-44ab-b7d2-3db8a95f4fd1',
    chapter_id: null,
    grade_level: 'GRADE_11',
    drive_url: url,
    resource_type: 'text_book',
    content_section: 'reading',
    book_title: 'Class 11 Islamiat Textbook (Punjab)',
    light_file_url: url,
    dark_file_url: url,
    context_text_url: null,
  });
  if (error) throw new Error(error.message);
  console.log('inserted DB row');
}

main().catch((e) => { console.error(e); process.exit(1); });
