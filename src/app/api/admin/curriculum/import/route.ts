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

function asNumberOrNull(value: any) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeQuestionType(value: any) {
  const type = cleanString(value).toLowerCase().replace(/[ -]/g, '_');
  if (['mcq', 'short', 'long', 'numerical', 'exercise', 'true_false', 'fill_blank'].includes(type)) return type;
  if (type.includes('multiple')) return 'mcq';
  if (type.includes('numeric')) return 'numerical';
  return 'other';
}

function safeJson(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstString(...values: any[]) {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return '';
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

  const bookInput = safeJson(payload.book);
  if (!cleanString(bookInput.title)) {
    return NextResponse.json({ error: 'book.title is required.' }, { status: 400 });
  }
  if (!Array.isArray(payload.nodes)) {
    return NextResponse.json({ error: 'nodes must be an array.' }, { status: 400 });
  }
  if (!Array.isArray(payload.pages)) {
    return NextResponse.json({ error: 'pages must be an array for complete textbook imports.' }, { status: 400 });
  }

  const usablePages = payload.pages.filter((page: AnyRecord) => firstString(page.raw_text, page.extracted_text, page.text));
  if (!usablePages.length) {
    return NextResponse.json({ error: 'pages contains no usable raw_text/extracted_text. Refusing a structure-only import.' }, { status: 400 });
  }

  const sourceHash = cleanString(payload.source_hash) || null;
  let bookId: string | null = null;
  let createdNewBook = false;

  // Re-import safety: reuse the same book when a stable source hash is supplied;
  // otherwise match the main textbook identity and update it rather than creating duplicates.
  if (sourceHash) {
    const { data: existingImport } = await db
      .from('curriculum_imports')
      .select('book_id')
      .eq('source_hash', sourceHash)
      .eq('status', 'imported')
      .not('book_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingImport?.book_id) bookId = existingImport.book_id;
  }

  if (!bookId) {
    let existingQuery = db
      .from('curriculum_books')
      .select('id')
      .eq('title', cleanString(bookInput.title))
      .eq('scope_type', ['global', 'school', 'college'].includes(bookInput.scope_type) ? bookInput.scope_type : 'global');
    if (bookInput.organization_id) existingQuery = existingQuery.eq('organization_id', bookInput.organization_id);
    else existingQuery = existingQuery.is('organization_id', null);
    const { data: existingBook } = await existingQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (existingBook?.id) bookId = existingBook.id;
  }

  const bookRow = {
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
    page_count: bookInput.page_count == null ? usablePages.length : asInt(bookInput.page_count),
    extraction_version: cleanString(payload.extraction_version || bookInput.extraction_version) || 'curriculum-structure-v1-repaired',
    notes: cleanString(bookInput.notes) || null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (bookId) {
    const { error: updateError } = await db.from('curriculum_books').update(bookRow).eq('id', bookId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { data: book, error: bookError } = await db.from('curriculum_books').insert(bookRow).select('id').single();
    if (bookError || !book) {
      return NextResponse.json({ error: bookError?.message || 'Unable to create book.' }, { status: 500 });
    }
    bookId = book.id;
    createdNewBook = true;
  }

  const importRow = {
    book_id: bookId,
    source_file_name: cleanString(payload.source_file_name) || null,
    source_file_url: cleanString(bookInput.source_file_url) || null,
    source_hash: sourceHash,
    importer: cleanString(payload.importer) || 'chatgpt-json',
    importer_version: cleanString(payload.importer_version) || 'curriculum-import-v2',
    status: 'validated',
    raw_payload: payload,
    created_by: user.id,
  };

  const { data: importRecord, error: importError } = await db.from('curriculum_imports').insert(importRow).select('id').single();
  if (importError || !importRecord) {
    if (createdNewBook) await db.from('curriculum_books').delete().eq('id', bookId);
    return NextResponse.json({ error: importError?.message || 'Unable to create import record.' }, { status: 500 });
  }

  const counters = {
    nodes: 0,
    content: 0,
    examples: 0,
    questions: 0,
    pages: 0,
    concepts: 0,
    prerequisites: 0,
  };

  const conceptIdMap = new Map<string, string>();
  const conceptPrerequisiteRefs: Array<{ conceptIdKey: string; prerequisiteKey: string }> = [];

  // On a true re-import, clear the prior extracted rows for this book so the database
  // contains exactly the latest JSON rather than duplicated children.
  if (!createdNewBook) {
    const { data: oldNodes } = await db.from('curriculum_nodes').select('id').eq('book_id', bookId);
    const oldNodeIds = (oldNodes || []).map((row: AnyRecord) => row.id).filter(Boolean);
    if (oldNodeIds.length) {
      await db.from('curriculum_content_blocks').delete().in('node_id', oldNodeIds);
      await db.from('curriculum_examples').delete().in('node_id', oldNodeIds);
      await db.from('curriculum_questions').delete().in('node_id', oldNodeIds);
      await db.from('curriculum_nodes').delete().eq('book_id', bookId);
    }
    await db.from('curriculum_pages').delete().eq('book_id', bookId);
  }

  async function insertConcepts(input: AnyRecord, nodeId: string | null) {
    const sourceConcepts = Array.isArray(input.concepts)
      ? input.concepts
      : Array.isArray(input.concept_list)
        ? input.concept_list
        : [];

    for (let index = 0; index < sourceConcepts.length; index += 1) {
      const concept = typeof sourceConcepts[index] === 'string' ? { title: sourceConcepts[index] } : safeJson(sourceConcepts[index]);
      const title = firstString(concept.title, concept.name, concept.concept, concept.text);
      if (!title) continue;

      const sourceKey = firstString(concept.key, concept.id, concept.code, concept.slo_code, `${nodeId || 'book'}:${index}:${title}`);
      const { data: row, error } = await db.from('curriculum_concepts').insert({
        subject_id: concept.subject_id || bookInput.subject_id || null,
        chapter_id: concept.chapter_id || null,
        board: firstString(concept.board, bookInput.board) || null,
        grade_level: firstString(concept.grade_level, bookInput.grade_level) || null,
        slo_code: cleanString(concept.slo_code) || null,
        title,
        description: firstString(concept.description, concept.definition) || null,
        difficulty: cleanString(concept.difficulty) || null,
        order_index: asInt(concept.order_index, index),
      }).select('id').single();
      if (error || !row) throw new Error(error?.message || `Failed to insert concept ${title}`);

      conceptIdMap.set(sourceKey, row.id);
      counters.concepts += 1;

      const prerequisites = Array.isArray(concept.prerequisites) ? concept.prerequisites : [];
      for (const prerequisite of prerequisites) {
        const prerequisiteKey = typeof prerequisite === 'string'
          ? cleanString(prerequisite)
          : firstString(prerequisite?.key, prerequisite?.id, prerequisite?.code, prerequisite?.title, prerequisite?.name);
        if (prerequisiteKey) conceptPrerequisiteRefs.push({ conceptIdKey: sourceKey, prerequisiteKey });
      }
    }
  }

  async function insertNode(input: AnyRecord, parentId: string | null, inheritedNumbers: string[], inheritedTitles: string[], fallbackOrder: number) {
    const number = firstString(input.number, input.code, input.section_number) || null;
    const title = firstString(input.title, input.name, number ? `Section ${number}` : 'Untitled section');
    const pathNumbers = [...inheritedNumbers, ...(number ? [number] : [])].join(' > ') || null;
    const pathTitles = [...inheritedTitles, title].join(' > ');
    const depth = inheritedTitles.length;

    const requestedType = cleanString(input.node_type).toLowerCase();
    const nodeType = ['chapter', 'topic', 'subtopic', 'section', 'exercise', 'appendix'].includes(requestedType)
      ? requestedType
      : depth === 0 ? 'chapter' : depth === 1 ? 'topic' : 'subtopic';

    const { data: node, error } = await db.from('curriculum_nodes').insert({
      book_id: bookId,
      parent_id: parentId,
      node_type: nodeType,
      number,
      title,
      slug: firstString(input.slug) || null,
      depth,
      sort_order: asInt(input.sort_order, fallbackOrder),
      path_numbers: pathNumbers,
      path_titles: pathTitles,
      raw_heading: firstString(input.raw_heading, input.heading) || null,
      source_page_start: input.source_page_start == null ? null : asInt(input.source_page_start),
      source_page_end: input.source_page_end == null ? null : asInt(input.source_page_end),
      is_published: Boolean(input.is_published ?? bookInput.status === 'published'),
      metadata: safeJson(input.metadata),
    }).select('id').single();

    if (error || !node) throw new Error(error?.message || `Failed to insert node ${title}`);
    counters.nodes += 1;

    if (Array.isArray(input.content)) {
      const rows = input.content.map((block: AnyRecord, index: number) => ({
        node_id: node.id,
        block_type: ['paragraph','definition','example','formula','table','note','procedure','diagram_caption','raw_text','heading','quote','code'].includes(cleanString(block.block_type)) ? cleanString(block.block_type) : 'paragraph',
        ordinal: asInt(block.ordinal, index),
        exact_text: firstString(block.exact_text, block.text, block.raw_text),
        normalized_text: firstString(block.normalized_text, block.verified_text) || null,
        source_page: block.source_page == null ? null : asInt(block.source_page),
        source_page_end: block.source_page_end == null ? null : asInt(block.source_page_end),
        source_label: firstString(block.source_label, block.printed_page_label) || null,
        metadata: safeJson(block.metadata),
      })).filter((row: AnyRecord) => row.exact_text);
      if (rows.length) {
        const { error: e } = await db.from('curriculum_content_blocks').insert(rows);
        if (e) throw new Error(e.message);
        counters.content += rows.length;
      }
    }

    if (Array.isArray(input.content_blocks)) {
      const rows = input.content_blocks.map((block: AnyRecord, index: number) => ({
        node_id: node.id,
        block_type: ['paragraph','definition','example','formula','table','note','procedure','diagram_caption','raw_text','heading','quote','code'].includes(cleanString(block.block_type)) ? cleanString(block.block_type) : 'paragraph',
        ordinal: asInt(block.ordinal, index),
        exact_text: firstString(block.exact_text, block.text, block.raw_text),
        normalized_text: firstString(block.normalized_text, block.verified_text) || null,
        source_page: block.source_page == null ? null : asInt(block.source_page),
        source_page_end: block.source_page_end == null ? null : asInt(block.source_page_end),
        source_label: firstString(block.source_label, block.printed_page_label) || null,
        metadata: safeJson(block.metadata),
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
        title: firstString(example.title, example.name) || null,
        exact_question: firstString(example.exact_question, example.question) || null,
        exact_solution: firstString(example.exact_solution, example.solution, example.answer) || null,
        explanation: firstString(example.explanation) || null,
        source_page: example.source_page == null ? null : asInt(example.source_page),
        metadata: safeJson(example.metadata),
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
        question_number: firstString(question.question_number, question.number) || null,
        exercise_number: firstString(question.exercise_number) || null,
        exact_text: firstString(question.exact_text, question.text, question.question),
        options: question.options && typeof question.options === 'object' ? question.options : null,
        exact_answer: firstString(question.exact_answer, question.answer) || null,
        explanation: firstString(question.explanation) || null,
        marks: asNumberOrNull(question.marks),
        difficulty: firstString(question.difficulty) || null,
        source_page: question.source_page == null ? null : asInt(question.source_page),
        metadata: safeJson(question.metadata),
      })).filter((row: AnyRecord) => row.exact_text);
      if (rows.length) {
        const { error: e } = await db.from('curriculum_questions').insert(rows);
        if (e) throw new Error(e.message);
        counters.questions += rows.length;
      }
    }

    await insertConcepts(input, node.id);

    if (Array.isArray(input.children)) {
      for (let i = 0; i < input.children.length; i += 1) {
        await insertNode(
          safeJson(input.children[i]),
          node.id,
          [...inheritedNumbers, ...(number ? [number] : [])],
          [...inheritedTitles, title],
          i,
        );
      }
    }
  }

  try {
    // Store page-level source text first. raw_text remains the source transcript;
    // OCR verification belongs in metadata/normalized fields and never replaces it.
    const pageRows = payload.pages.map((page: AnyRecord, index: number) => ({
      book_id: bookId,
      page_number: asInt(page.page_number ?? page.number, index + 1),
      printed_page_label: firstString(page.printed_page_label, page.label) || null,
      extracted_text: firstString(page.raw_text, page.extracted_text, page.text) || null,
      image_url: firstString(page.image_url) || null,
      metadata: {
        ...safeJson(page.metadata),
        extraction_confidence: page.extraction_confidence ?? null,
        ocr_uncertain_regions: Array.isArray(page.ocr_uncertain_regions) ? page.ocr_uncertain_regions : [],
        source_raw_text_preserved: true,
      },
    }));
    const { error: pageError } = await db.from('curriculum_pages').upsert(pageRows, { onConflict: 'book_id,page_number' });
    if (pageError) throw new Error(pageError.message);
    counters.pages = pageRows.length;

    for (let i = 0; i < payload.nodes.length; i += 1) {
      await insertNode(safeJson(payload.nodes[i]), null, [], [], i);
    }

    // Resolve prerequisite references only after all concepts are known.
    for (const ref of conceptPrerequisiteRefs) {
      const conceptId = conceptIdMap.get(ref.conceptIdKey);
      const prerequisiteId = conceptIdMap.get(ref.prerequisiteKey);
      if (!conceptId || !prerequisiteId) continue;
      const { error: prerequisiteError } = await db.from('curriculum_prerequisites').upsert({
        concept_id: conceptId,
        prerequisite_concept_id: prerequisiteId,
      }, { onConflict: 'concept_id,prerequisite_concept_id' });
      if (prerequisiteError) throw new Error(prerequisiteError.message);
      counters.prerequisites += 1;
    }

    const validationErrors: Array<{ message: string }> = [];
    if (bookInput.page_count != null && asInt(bookInput.page_count) !== counters.pages) {
      validationErrors.push({ message: `book.page_count=${asInt(bookInput.page_count)} but imported pages=${counters.pages}` });
    }
    if (!counters.nodes) validationErrors.push({ message: 'No curriculum nodes were imported.' });
    if (counters.questions === 0 && counters.content === 0) {
      validationErrors.push({ message: 'No content blocks or questions were imported; verify the JSON extraction.' });
    }

    if (validationErrors.length) {
      await db.from('curriculum_imports').update({ status: 'failed', validation_errors: validationErrors, completed_at: new Date().toISOString() }).eq('id', importRecord.id);
      await db.from('curriculum_books').update({ extraction_status: 'failed' }).eq('id', bookId);
      return NextResponse.json({ ok: false, error: 'Import validation failed.', book_id: bookId, import_id: importRecord.id, counters, validation_errors: validationErrors }, { status: 422 });
    }

    await db.from('curriculum_imports').update({ status: 'imported', completed_at: new Date().toISOString(), validation_errors: null }).eq('id', importRecord.id);
    await db.from('curriculum_books').update({ extraction_status: 'ready' }).eq('id', bookId);

    return NextResponse.json({
      ok: true,
      book_id: bookId,
      import_id: importRecord.id,
      counters,
    });
  } catch (e: any) {
    await db.from('curriculum_books').update({ extraction_status: 'failed' }).eq('id', bookId);
    await db.from('curriculum_imports').update({ status: 'failed', validation_errors: [{ message: e?.message || 'Import failed' }], completed_at: new Date().toISOString() }).eq('id', importRecord.id);
    return NextResponse.json({ error: e?.message || 'Import failed.', book_id: bookId, import_id: importRecord.id, counters }, { status: 500 });
  }
}
