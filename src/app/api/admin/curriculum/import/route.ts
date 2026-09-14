import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type AnyRecord = Record<string, any>;

function cleanString(value: any) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function asInt(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeQuestionType(value: any) {
  const type = cleanString(value).toLowerCase().replace(/[ -]/g, '_');
  if (['mcq', 'short', 'long', 'numerical', 'exercise', 'true_false', 'fill_blank'].includes(type)) return type;
  if (type.includes('multiple')) return 'mcq';
  if (type.includes('numeric')) return 'numerical';
  return 'other';
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const db = createServiceClient();
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (String(profile?.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  let payload: AnyRecord;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  const bookInput = payload.book || {};
  if (!cleanString(bookInput.title)) return NextResponse.json({ error: 'book.title is required.' }, { status: 400 });
  if (!Array.isArray(payload.nodes)) return NextResponse.json({ error: 'nodes must be an array.' }, { status: 400 });

  const { data: book, error: bookError } = await db
    .from('curriculum_books')
    .insert({
      title: cleanString(bookInput.title),
      subject_id: bookInput.subject_id || null,
      grade_level: cleanString(bookInput.grade_level) || null,
      board: cleanString(bookInput.board) || null,
      curriculum: cleanString(bookInput.curriculum) || null,
      edition: cleanString(bookInput.edition) || null,
      publisher: cleanString(bookInput.publisher) || null,
      language: cleanString(bookInput.language) || null,
      book_code: cleanString(bookInput.book_code) || null,
      source_resource_id: bookInput.source_resource_id || null,
      scope_type: ['global', 'school', 'college'].includes(bookInput.scope_type) ? bookInput.scope_type : 'global',
      organization_id: bookInput.organization_id || null,
      status: ['draft', 'review', 'published', 'archived'].includes(bookInput.status) ? bookInput.status : 'draft',
      extraction_status: 'ready',
      source_file_url: cleanString(bookInput.source_file_url) || null,
      page_count: bookInput.page_count == null ? null : asInt(bookInput.page_count),
      extraction_version: cleanString(payload.extraction_version || bookInput.extraction_version) || 'deepseek-structured-v1',
      notes: cleanString(bookInput.notes) || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: bookError?.message || 'Unable to create book.' }, { status: 500 });
  }
  const bookId = book.id;

  const { error: importError } = await db.from('curriculum_imports').insert({
    book_id: bookId,
    source_file_name: cleanString(payload.source_file_name) || null,
    source_file_url: cleanString(bookInput.source_file_url) || null,
    source_hash: cleanString(payload.source_hash) || null,
    importer: cleanString(payload.importer) || 'deepseek',
    importer_version: cleanString(payload.importer_version) || null,
    status: 'validated',
    raw_payload: payload,
    created_by: user.id,
  });

  if (importError) {
    await db.from('curriculum_books').delete().eq('id', bookId);
    return NextResponse.json({ error: importError.message }, { status: 500 });
  }

  const counters = { nodes: 0, content: 0, examples: 0, questions: 0, pages: 0 };
  const nodeIdMap = new Map<string, string>();

  async function insertNode(input: AnyRecord, parentId: string | null, inheritedNumbers: string[], inheritedTitles: string[], fallbackOrder: number) {
    const number = cleanString(input.number || input.code || input.section_number) || null;
    const title = cleanString(input.title || input.name || (number ? `Section ${number}` : 'Untitled section'));
    const pathNumbers = [...inheritedNumbers, ...(number ? [number] : [])].join(' > ') || null;
    const pathTitles = [...inheritedTitles, title].join(' > ');
    const depth = inheritedTitles.length;

    const { data: node, error } = await db.from('curriculum_nodes').insert({
      book_id: bookId,
      parent_id: parentId,
      node_type: ['chapter', 'topic', 'subtopic', 'section', 'exercise', 'appendix'].includes(input.node_type) ? input.node_type : depth === 0 ? 'chapter' : depth === 1 ? 'topic' : 'subtopic',
      number,
      title,
      slug: cleanString(input.slug) || null,
      depth,
      sort_order: asInt(input.sort_order, fallbackOrder),
      path_numbers: pathNumbers,
      path_titles: pathTitles,
      raw_heading: cleanString(input.raw_heading || input.heading) || null,
      source_page_start: input.source_page_start == null ? null : asInt(input.source_page_start),
      source_page_end: input.source_page_end == null ? null : asInt(input.source_page_end),
      is_published: Boolean(input.is_published ?? bookInput.status === 'published'),
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    }).select('id').single();

    if (error || !node) throw new Error(error?.message || `Failed to insert node ${title}`);
    counters.nodes += 1;
    if (input.key) nodeIdMap.set(String(input.key), node.id);

    if (Array.isArray(input.content)) {
      const rows = input.content.map((block: AnyRecord, index: number) => ({
        node_id: node.id,
        block_type: ['paragraph','definition','example','formula','table','note','procedure','diagram_caption','raw_text','heading','quote','code'].includes(block.block_type) ? block.block_type : 'paragraph',
        ordinal: asInt(block.ordinal, index),
        exact_text: cleanString(block.exact_text ?? block.text),
        normalized_text: cleanString(block.normalized_text) || null,
        source_page: block.source_page == null ? null : asInt(block.source_page),
        source_page_end: block.source_page_end == null ? null : asInt(block.source_page_end),
        source_label: cleanString(block.source_label) || null,
        metadata: block.metadata && typeof block.metadata === 'object' ? block.metadata : {},
      })).filter((row: AnyRecord) => row.exact_text);
      if (rows.length) {
        const { error: e } = await db.from('curriculum_content_blocks').insert(rows);
        if (e) throw new Error(e.message);
        counters.content += rows.length;
      }
    }

    if (Array.isArray(input.examples)) {
      const rows = input.examples.map((example: AnyRecord, index: number) => ({
        node_id: node.id,
        ordinal: asInt(example.ordinal, index),
        title: cleanString(example.title) || null,
        exact_question: cleanString(example.exact_question ?? example.question) || null,
        exact_solution: cleanString(example.exact_solution ?? example.solution) || null,
        explanation: cleanString(example.explanation) || null,
        source_page: example.source_page == null ? null : asInt(example.source_page),
        metadata: example.metadata && typeof example.metadata === 'object' ? example.metadata : {},
      })).filter((row: AnyRecord) => row.exact_question || row.exact_solution || row.explanation);
      if (rows.length) {
        const { error: e } = await db.from('curriculum_examples').insert(rows);
        if (e) throw new Error(e.message);
        counters.examples += rows.length;
      }
    }

    if (Array.isArray(input.questions)) {
      const rows = input.questions.map((question: AnyRecord, index: number) => ({
        node_id: node.id,
        question_type: normalizeQuestionType(question.question_type || question.type),
        ordinal: asInt(question.ordinal, index),
        question_number: cleanString(question.question_number || question.number) || null,
        exercise_number: cleanString(question.exercise_number) || null,
        exact_text: cleanString(question.exact_text ?? question.text ?? question.question),
        options: question.options && typeof question.options === 'object' ? question.options : null,
        exact_answer: cleanString(question.exact_answer ?? question.answer) || null,
        explanation: cleanString(question.explanation) || null,
        marks: question.marks == null ? null : Number(question.marks),
        difficulty: cleanString(question.difficulty) || null,
        source_page: question.source_page == null ? null : asInt(question.source_page),
        metadata: question.metadata && typeof question.metadata === 'object' ? question.metadata : {},
      })).filter((row: AnyRecord) => row.exact_text);
      if (rows.length) {
        const { error: e } = await db.from('curriculum_questions').insert(rows);
        if (e) throw new Error(e.message);
        counters.questions += rows.length;
      }
    }

    if (Array.isArray(input.children)) {
      for (let i = 0; i < input.children.length; i += 1) {
        await insertNode(input.children[i], node.id, [...inheritedNumbers, ...(number ? [number] : [])], [...inheritedTitles, title], i);
      }
    }
  }

  try {
    for (let i = 0; i < payload.nodes.length; i += 1) {
      await insertNode(payload.nodes[i], null, [], [], i);
    }

    if (Array.isArray(payload.pages)) {
      const rows = payload.pages.map((page: AnyRecord, index: number) => ({
        book_id: bookId,
        page_number: asInt(page.page_number ?? page.number, index + 1),
        printed_page_label: cleanString(page.printed_page_label) || null,
        extracted_text: cleanString(page.extracted_text ?? page.text) || null,
        image_url: cleanString(page.image_url) || null,
        metadata: page.metadata && typeof page.metadata === 'object' ? page.metadata : {},
      }));
      const { error: e } = await db.from('curriculum_pages').upsert(rows, { onConflict: 'book_id,page_number' });
      if (e) throw new Error(e.message);
      counters.pages += rows.length;
    }

    await db.from('curriculum_imports').update({ status: 'imported', completed_at: new Date().toISOString(), validation_errors: null }).eq('book_id', bookId).order('created_at', { ascending: false }).limit(1);
    await db.from('curriculum_books').update({ extraction_status: 'ready' }).eq('id', bookId);
    return NextResponse.json({ ok: true, book_id: bookId, counters });
  } catch (e: any) {
    await db.from('curriculum_books').update({ extraction_status: 'failed' }).eq('id', bookId);
    await db.from('curriculum_imports').update({ status: 'failed', validation_errors: [{ message: e?.message || 'Import failed' }] }).eq('book_id', bookId).order('created_at', { ascending: false }).limit(1);
    return NextResponse.json({ error: e?.message || 'Import failed.', book_id: bookId, counters }, { status: 500 });
  }
}
