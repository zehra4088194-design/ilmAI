import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type AnyRecord = Record<string, any>;

export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH_SIZE = 100;

function cleanString(value: any) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function asInt(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asNumberOrNull(value: any) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeJson(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstString(...values: any[]) {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return '';
}

function normalizeQuestionType(value: any) {
  const type = cleanString(value).toLowerCase().replace(/[ -]/g, '_');
  if (['mcq', 'short', 'long', 'numerical', 'exercise', 'true_false', 'fill_blank'].includes(type)) return type;
  if (type.includes('multiple')) return 'mcq';
  if (type.includes('numeric')) return 'numerical';
  return type || 'other';
}

function pageRefs(value: any) {
  if (!Array.isArray(value)) return [] as number[];
  return value.map((v) => asInt(v, -1)).filter((v) => v > 0);
}

function chunks<T>(items: T[], size = BATCH_SIZE) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function recursiveNodes(input: AnyRecord[], parentId: string | null = null) {
  const out: Array<{ input: AnyRecord; parentId: string | null; treeIndex: number }> = [];
  input.forEach((node, index) => {
    out.push({ input: safeJson(node), parentId, treeIndex: index });
    const nodeId = cleanString(node.id) || null;
    void nodeId;
  });
  return out;
}

function pickBookMetadata(bookInput: AnyRecord, payload: AnyRecord, usablePageCount: number) {
  return {
    title: firstString(bookInput.title),
    subject_id: cleanString(bookInput.subject_id) || null,
    grade_level: firstString(bookInput.grade_level, bookInput.grade) || null,
    board: firstString(bookInput.board) || null,
    curriculum: firstString(bookInput.curriculum, bookInput.year ? `Revised National Curriculum of Pakistan ${bookInput.year}` : '') || null,
    edition: firstString(bookInput.edition) || null,
    publisher: firstString(bookInput.publisher) || null,
    language: firstString(bookInput.language, bookInput.medium) || null,
    book_code: firstString(bookInput.book_code) || null,
    source_resource_id: cleanString(bookInput.source_resource_id) || null,
    scope_type: ['global', 'school', 'college'].includes(bookInput.scope_type) ? bookInput.scope_type : 'global',
    organization_id: cleanString(bookInput.organization_id) || null,
    status: ['draft', 'review', 'published', 'archived'].includes(bookInput.status) ? bookInput.status : 'draft',
    extraction_status: 'ready',
    source_file_url: firstString(bookInput.source_file_url) || null,
    page_count: bookInput.page_count == null ? asInt(bookInput.total_pages, usablePageCount) : asInt(bookInput.page_count),
    extraction_version: firstString(payload.extraction_version, bookInput.extraction_version) || 'curriculum-structure-v1-ocr-repaired',
    notes: firstString(bookInput.notes, bookInput.source) || null,
  };
}

async function deleteBookChildren(db: any, bookId: string) {
  const { data: oldNodes, error: nodeReadError } = await db.from('curriculum_nodes').select('id').eq('book_id', bookId);
  if (nodeReadError) throw new Error(nodeReadError.message);
  const oldNodeIds = (oldNodes || []).map((row: AnyRecord) => row.id).filter(Boolean);
  for (const ids of chunks(oldNodeIds)) {
    if (!ids.length) continue;
    const deletes = await Promise.all([
      db.from('curriculum_content_blocks').delete().in('node_id', ids),
      db.from('curriculum_examples').delete().in('node_id', ids),
      db.from('curriculum_questions').delete().in('node_id', ids),
    ]);
    for (const result of deletes) if (result.error) throw new Error(result.error.message);
  }
  if (oldNodeIds.length) {
    for (const ids of chunks(oldNodeIds)) {
      const { error } = await db.from('curriculum_nodes').delete().in('id', ids);
      if (error) throw new Error(error.message);
    }
  }
  const { error: pageDeleteError } = await db.from('curriculum_pages').delete().eq('book_id', bookId);
  if (pageDeleteError) throw new Error(pageDeleteError.message);
}

async function batchInsert(db: any, table: string, rows: AnyRecord[]) {
  for (const batch of chunks(rows)) {
    if (!batch.length) continue;
    const { error } = await db.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const db = createServiceClient();
  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profileError) return NextResponse.json({ error: 'Unable to verify admin access.' }, { status: 500 });
  if (String(profile?.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  let payload: AnyRecord;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  const bookInput = safeJson(payload.book);
  if (!firstString(bookInput.title)) return NextResponse.json({ error: 'book.title is required.' }, { status: 400 });
  if (!Array.isArray(payload.nodes)) return NextResponse.json({ error: 'nodes must be an array.' }, { status: 400 });
  if (!Array.isArray(payload.pages)) return NextResponse.json({ error: 'pages must be an array for complete textbook imports.' }, { status: 400 });

  const sourceHash = firstString(payload.source_hash) || null;
  if (!sourceHash) return NextResponse.json({ error: 'source_hash is required for idempotent textbook imports.' }, { status: 400 });

  if (sourceHash) {
    const { data: existingImport, error } = await db.from('curriculum_imports')
      .select('id,book_id,status,completed_at')
      .eq('source_hash', sourceHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (existingImport?.status === 'imported' && existingImport.book_id) {
      const [{ count: pages }, { count: nodes }, { count: content }, { count: examples }, { count: questions }] = await Promise.all([
        db.from('curriculum_pages').select('id', { count: 'exact', head: true }).eq('book_id', existingImport.book_id),
        db.from('curriculum_nodes').select('id', { count: 'exact', head: true }).eq('book_id', existingImport.book_id),
        db.from('curriculum_content_blocks').select('id', { count: 'exact', head: true }).in('node_id', (await db.from('curriculum_nodes').select('id').eq('book_id', existingImport.book_id)).data?.map((n: any) => n.id) || ['00000000-0000-0000-0000-000000000000']),
        db.from('curriculum_examples').select('id', { count: 'exact', head: true }).in('node_id', (await db.from('curriculum_nodes').select('id').eq('book_id', existingImport.book_id)).data?.map((n: any) => n.id) || ['00000000-0000-0000-0000-000000000000']),
        db.from('curriculum_questions').select('id', { count: 'exact', head: true }).in('node_id', (await db.from('curriculum_nodes').select('id').eq('book_id', existingImport.book_id)).data?.map((n: any) => n.id) || ['00000000-0000-0000-0000-000000000000']),
      ]);
      return NextResponse.json({ ok: true, reused: true, book_id: existingImport.book_id, import_id: existingImport.id, counters: { pages: pages || 0, nodes: nodes || 0, content: content || 0, examples: examples || 0, questions: questions || 0, concepts: 0, prerequisites: 0 } });
    }
  }

  const usablePageCount = payload.pages.length;
  const bookRow = pickBookMetadata(bookInput, payload, usablePageCount);
  let bookId: string | null = null;
  let importId: string | null = null;
  let createdNewBook = false;

  const existingBookQuery = db.from('curriculum_books').select('id').eq('title', bookRow.title).eq('scope_type', bookRow.scope_type);
  const { data: existingBook, error: existingBookError } = bookRow.organization_id
    ? await existingBookQuery.eq('organization_id', bookRow.organization_id).maybeSingle()
    : await existingBookQuery.is('organization_id', null).maybeSingle();
  if (existingBookError) return NextResponse.json({ error: existingBookError.message }, { status: 500 });
  if (existingBook?.id) {
    return NextResponse.json({ error: 'A curriculum book with this identity already exists. Use the existing imported source hash for an idempotent re-run or explicitly remove it first.' }, { status: 409 });
  }

  try {
    const { data: book, error: bookError } = await db.from('curriculum_books').insert({ ...bookRow, created_by: user.id, updated_at: new Date().toISOString() }).select('id').single();
    if (bookError || !book) throw new Error(bookError?.message || 'Unable to create curriculum book.');
    bookId = book.id;
    createdNewBook = true;

    const { data: importRecord, error: importError } = await db.from('curriculum_imports').insert({
      book_id: bookId,
      source_file_name: firstString(payload.source_file_name, bookInput.title) || null,
      source_file_url: firstString(bookInput.source_file_url) || null,
      source_hash: sourceHash,
      importer: firstString(payload.importer) || 'chatgpt-json',
      importer_version: firstString(payload.importer_version, payload.extraction_version) || 'curriculum-import-v3-universal',
      status: 'validated',
      raw_payload: payload,
      created_by: user.id,
    }).select('id').single();
    if (importError || !importRecord) throw new Error(importError?.message || 'Unable to create import record.');
    importId = importRecord.id;

    const counters = { nodes: 0, content: 0, examples: 0, questions: 0, pages: 0, concepts: 0, prerequisites: 0 };
    const pageMap = new Map<number, AnyRecord>(payload.pages.map((p: AnyRecord) => [asInt(p.page_number ?? p.number), p]));
    const pageRows = payload.pages.map((page: AnyRecord, index: number) => ({
      book_id: bookId,
      page_number: asInt(page.page_number ?? page.number, index + 1),
      printed_page_label: firstString(page.printed_page_label, page.label) || null,
      extracted_text: firstString(page.raw_text, page.extracted_text, page.text) || '',
      image_url: firstString(page.image_url) || null,
      metadata: {
        ...safeJson(page.metadata),
        extraction_confidence: page.extraction_confidence ?? null,
        ocr_repaired: Boolean(page.ocr_repaired),
        ocr_uncertain_regions: Array.isArray(page.ocr_uncertain_regions) ? page.ocr_uncertain_regions : [],
        source_page_number: asInt(page.page_number ?? page.number, index + 1),
        source_printed_page_label: firstString(page.printed_page_label, page.label) || null,
      },
    }));
    await batchInsert(db, 'curriculum_pages', pageRows);
    counters.pages = pageRows.length;

    const sourceNodeToDbId = new Map<string, string>();
    const insertNode = async (input: AnyRecord, parentDbId: string | null, orderFallback: number) => {
      const sourceId = firstString(input.id, `${parentDbId || 'root'}:${input.number || ''}:${input.title || input.exact_title || orderFallback}`);
      const dbNodeId = crypto.randomUUID();
      sourceNodeToDbId.set(sourceId, dbNodeId);
      const number = firstString(input.number, input.code, input.section_number) || null;
      const title = firstString(input.exact_title, input.title, input.name, number ? `Section ${number}` : 'Untitled section');
      const headingPath = Array.isArray(input.heading_path) ? input.heading_path : [];
      const sourceDepth = Number.isFinite(Number(input.depth)) ? asInt(input.depth) : (headingPath.length ? headingPath.length - 1 : 0);
      const sourcePages = [input.start_page, input.end_page].map((v) => asInt(v, 0)).filter((v) => v > 0);
      const normalizedNodeType = cleanString(input.node_type).toLowerCase();
      const dbNodeType = ['chapter','topic','subtopic','section','exercise','appendix'].includes(normalizedNodeType)
        ? normalizedNodeType
        : normalizedNodeType === 'special_section'
          ? 'section'
          : sourceDepth === 0 ? 'chapter' : sourceDepth === 1 ? 'topic' : 'subtopic';

      const { error: nodeError } = await db.from('curriculum_nodes').insert({
        id: dbNodeId,
        book_id: bookId,
        parent_id: parentDbId,
        node_type: dbNodeType,
        number,
        title,
        slug: firstString(input.slug) || null,
        depth: sourceDepth,
        sort_order: asInt(input.order, orderFallback),
        path_numbers: Array.isArray(input.heading_path) ? input.heading_path.map((x: any) => cleanString(x)).filter(Boolean).join(' > ') : number,
        path_titles: headingPath.length ? headingPath.join(' > ') : title,
        raw_heading: title,
        source_page_start: sourcePages[0] || null,
        source_page_end: sourcePages[1] || sourcePages[0] || null,
        is_published: Boolean(input.is_published ?? false),
        metadata: {
          source_node_id: firstString(input.id) || null,
          source_parent_id: firstString(input.parent_id) || null,
          source_depth: sourceDepth,
          source_order: asInt(input.order, orderFallback),
          source_heading_path: headingPath,
          source_exact_title: firstString(input.exact_title, input.title) || null,
          source_node_type: cleanString(input.node_type) || 'section',
          source_start_page: input.start_page ?? null,
          source_end_page: input.end_page ?? null,
          source_page_refs_present: sourcePages.length > 0,
          source_metadata: safeJson(input.metadata),
        },
      });
      if (nodeError) throw new Error(`curriculum_nodes: ${nodeError.message}`);
      counters.nodes += 1;

      const sourceBlocks = Array.isArray(input.content_blocks) ? input.content_blocks : Array.isArray(input.content) ? input.content : [];
      const blockRows = sourceBlocks.map((block: AnyRecord, index: number) => {
        const refs = pageRefs(block.page_refs || block.source_pages || block.page_refs);
        const sourceType = firstString(block.type, block.block_type) || 'other';
        const text = firstString(block.text, block.exact_text, block.raw_text);
        const firstPage = refs[0] || asInt(block.source_page, 0) || asInt(input.start_page, 0) || null;
        const lastPage = refs[refs.length - 1] || asInt(block.source_page_end, 0) || firstPage || null;
        const dbBlockType = ['paragraph','definition','example','formula','table','note','procedure','diagram_caption','raw_text','heading','quote','code'].includes(sourceType) ? sourceType : 'raw_text';
        return text ? {
          node_id: dbNodeId,
          block_type: dbBlockType,
          ordinal: index,
          exact_text: text,
          normalized_text: firstString(block.normalized_text, block.verified_text) || null,
          source_page: firstPage,
          source_page_end: lastPage,
          source_label: firstString((pageMap.get(firstPage || 0) || {}).printed_page_label) || null,
          metadata: {
            source_type: sourceType,
            source_page_refs: refs,
            source_block: safeJson(block),
          },
        } : null;
      }).filter(Boolean) as AnyRecord[];
      await batchInsert(db, 'curriculum_content_blocks', blockRows);
      counters.content += blockRows.length;

      const exampleRows = (Array.isArray(input.examples) ? input.examples : []).map((example: AnyRecord, index: number) => {
        const refs = pageRefs(example.page_refs);
        const text = firstString(example.text, example.explanation);
        const title = firstString(example.title, example.name) || null;
        const firstPage = refs[0] || asInt(input.start_page, 0) || null;
        return (text || title) ? {
          node_id: dbNodeId,
          ordinal: index,
          title,
          exact_question: firstString(example.exact_question, example.question) || null,
          exact_solution: firstString(example.exact_solution, example.solution, example.answer) || null,
          explanation: text || null,
          source_page: firstPage,
          metadata: { source_text: text || null, source_page_refs: refs, source_example: safeJson(example) },
        } : null;
      }).filter(Boolean) as AnyRecord[];
      await batchInsert(db, 'curriculum_examples', exampleRows);
      counters.examples += exampleRows.length;

      const questionRows = (Array.isArray(input.questions) ? input.questions : []).map((question: AnyRecord, index: number) => {
        const refs = pageRefs(question.page_refs);
        const firstPage = refs[0] || asInt(question.source_page, 0) || asInt(input.start_page, 0) || null;
        const optionValue = Array.isArray(question.options) || (question.options && typeof question.options === 'object') ? question.options : [];
        const exactAnswer = firstString(question.exact_answer, question.answer) || null;
        return {
          node_id: dbNodeId,
          question_type: normalizeQuestionType(question.type || question.question_type),
          ordinal: asInt(question.ordinal, index),
          question_number: firstString(question.number, question.question_number) || null,
          exercise_number: firstString(question.exercise_number) || null,
          exact_text: firstString(question.text, question.exact_text, question.question),
          options: optionValue,
          exact_answer: exactAnswer,
          explanation: firstString(question.explanation) || null,
          marks: asNumberOrNull(question.marks),
          difficulty: firstString(question.difficulty) || null,
          source_page: firstPage,
          metadata: { source_page_refs: refs, source_question: safeJson(question) },
        };
      }).filter((row: AnyRecord) => row.exact_text);
      await batchInsert(db, 'curriculum_questions', questionRows);
      counters.questions += questionRows.length;

      const conceptRows = (Array.isArray(input.concepts) ? input.concepts : []).map((concept: AnyRecord, index: number) => {
        const title = firstString(concept.name, concept.title, concept.concept);
        return title ? {
          subject_id: cleanString(concept.subject_id) || bookRow.subject_id || null,
          chapter_id: cleanString(concept.chapter_id) || null,
          board: firstString(concept.board, bookRow.board) || null,
          grade_level: firstString(concept.grade_level, bookRow.grade_level) || null,
          slo_code: firstString(concept.slo_code, concept.code) || null,
          title,
          description: firstString(concept.definition, concept.description) || null,
          difficulty: firstString(concept.difficulty) || null,
          order_index: asInt(concept.order_index, index),
        } : null;
      }).filter(Boolean) as AnyRecord[];
      await batchInsert(db, 'curriculum_concepts', conceptRows);
      counters.concepts += conceptRows.length;

      const children = Array.isArray(input.children) ? input.children : [];
      for (let i = 0; i < children.length; i += 1) await insertNode(safeJson(children[i]), dbNodeId, i);
      return dbNodeId;
    };

    for (let i = 0; i < payload.nodes.length; i += 1) await insertNode(safeJson(payload.nodes[i]), null, i);

    if (counters.pages !== asInt(bookRow.page_count, counters.pages)) throw new Error(`Source page count ${bookRow.page_count} does not match imported pages ${counters.pages}.`);
    const expectedNodeCount = (function countNodes(list: AnyRecord[]): number { return list.reduce((sum: number, n: AnyRecord) => sum + 1 + (Array.isArray(n.children) ? countNodes(n.children) : 0), 0); })(payload.nodes as AnyRecord[]);
    if (counters.nodes !== expectedNodeCount) throw new Error(`Source node count ${expectedNodeCount} does not match imported nodes ${counters.nodes}.`);
    if (!counters.nodes) throw new Error('No curriculum nodes were imported.');
    if (counters.content === 0 && counters.questions === 0 && counters.examples === 0) throw new Error('No fine-grained textbook content was imported.');

    await db.from('curriculum_imports').update({ status: 'imported', completed_at: new Date().toISOString(), validation_errors: null }).eq('id', importId);
    await db.from('curriculum_books').update({ extraction_status: 'ready' }).eq('id', bookId);

    return NextResponse.json({ ok: true, book_id: bookId, import_id: importId, counters });
  } catch (error: any) {
    const message = error?.message || 'Import failed.';
    if (importId) await db.from('curriculum_imports').update({ status: 'failed', validation_errors: [{ message }], completed_at: new Date().toISOString() }).eq('id', importId);
    if (bookId && createdNewBook) {
      try { await deleteBookChildren(db, bookId); } catch (cleanupError) { console.error('[curriculum/import] cleanup failed', cleanupError); }
      await db.from('curriculum_imports').delete().eq('id', importId || '00000000-0000-0000-0000-000000000000');
      await db.from('curriculum_books').delete().eq('id', bookId);
    } else if (bookId) {
      await db.from('curriculum_books').update({ extraction_status: 'failed' }).eq('id', bookId);
    }
    return NextResponse.json({ ok: false, error: message, book_id: bookId, import_id: importId }, { status: 500 });
  }
}
