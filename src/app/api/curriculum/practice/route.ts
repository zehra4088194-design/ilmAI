import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isCurriculumEnabled } from '@/lib/features/curriculum';

export async function GET(req: NextRequest) {
  if (!(await isCurriculumEnabled())) {
    return NextResponse.json({ error: 'Smart Book Practice is currently disabled.' }, { status: 404 });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get('q')?.trim() || '';
  const bookId = params.get('book_id')?.trim() || '';
  const nodeId = params.get('node_id')?.trim() || '';
  const limit = Math.min(Math.max(Number(params.get('limit') || 12), 1), 30);
  const db = createServiceClient();

  const [{ data: books, error: booksError }, { data: nodes, error: nodesError }, { data: imports, error: importsError }] = await Promise.all([
    db.from('curriculum_books').select('id,title,subject_id,grade_level,board,curriculum,edition,publisher,language,page_count,status,scope_type,organization_id,subjects(name,slug)').eq('status', 'published').order('title').limit(50),
    (() => {
      let query = db.from('curriculum_nodes').select('id,book_id,parent_id,node_type,number,title,depth,sort_order,path_numbers,path_titles,source_page_start,source_page_end,is_published,curriculum_books!inner(id,title,grade_level,board,status,subjects(name,slug))').eq('is_published', true).eq('curriculum_books.status', 'published').order('depth').order('sort_order').limit(200);
      if (bookId) query = query.eq('book_id', bookId);
      if (q) { const escaped = q.replace(/[,%]/g, ' '); query = query.or(`number.ilike.%${escaped}%,title.ilike.%${escaped}%,path_numbers.ilike.%${escaped}%,path_titles.ilike.%${escaped}%`); }
      return query;
    })(),
    (() => {
      let query = db.from('curriculum_imports').select('id,book_id,source_file_name,source_file_url,importer,importer_version,status,validation_errors,created_at,completed_at').order('created_at', { ascending: false }).limit(50);
      if (bookId) query = query.eq('book_id', bookId);
      return query;
    })(),
  ]);

  if (booksError || nodesError || importsError) {
    console.error('[curriculum/practice]', booksError || nodesError || importsError);
    return NextResponse.json({ error: 'Unable to load Smart Book Practice.' }, { status: 500 });
  }

  let pages: any[] = [];
  let blocks: any[] = [];
  let examples: any[] = [];
  let questions: any[] = [];
  let concepts: any[] = [];
  let prerequisites: any[] = [];
  let attempts: any[] = [];

  if (q || bookId || nodeId) {
    const escaped = q.replace(/[,%]/g, ' ');
    const pagePromise = (() => { let query = db.from('curriculum_pages').select('id,book_id,page_number,printed_page_label,extracted_text,image_url').order('page_number').limit(limit); if (bookId) query = query.eq('book_id', bookId); if (q) query = query.ilike('extracted_text', `%${escaped}%`); return query; })();
    const blockPromise = (() => { let query = db.from('curriculum_content_blocks').select('id,node_id,block_type,ordinal,exact_text,source_page,source_page_end,source_label').order('ordinal').limit(limit); if (q) query = query.ilike('exact_text', `%${escaped}%`); if (nodeId) query = query.eq('node_id', nodeId); return query; })();
    const examplePromise = (() => { let query = db.from('curriculum_examples').select('id,node_id,ordinal,title,exact_question,exact_solution,explanation,source_page').order('ordinal').limit(limit); if (q) query = query.or(`title.ilike.%${escaped}%,exact_question.ilike.%${escaped}%,exact_solution.ilike.%${escaped}%`); if (nodeId) query = query.eq('node_id', nodeId); return query; })();
    const questionPromise = (() => { let query = db.from('curriculum_questions').select('id,node_id,question_type,question_number,exact_text,options,marks,difficulty,source_page').order('ordinal').limit(limit); if (q) query = query.ilike('exact_text', `%${escaped}%`); if (nodeId) query = query.eq('node_id', nodeId); return query; })();
    const conceptPromise = (() => { let query = db.from('curriculum_concepts').select('id,subject_id,chapter_id,board,grade_level,slo_code,title,description,difficulty,order_index').order('order_index').limit(limit); if (q) query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,slo_code.ilike.%${escaped}%`); if (nodeId) query = query.eq('chapter_id', nodeId); return query; })();

    const [pageRes, blockRes, exampleRes, questionRes, conceptRes] = await Promise.all([pagePromise, blockPromise, examplePromise, questionPromise, conceptPromise]);
    pages = pageRes.data || [];
    blocks = blockRes.data || [];
    examples = exampleRes.data || [];
    questions = questionRes.data || [];
    concepts = conceptRes.data || [];

    if (concepts.length) {
      const conceptIds = concepts.map((c) => c.id);
      const { data: prereqRows } = await db.from('curriculum_prerequisites').select('concept_id,prerequisite_concept_id,created_at').in('concept_id', conceptIds);
      prerequisites = prereqRows || [];
    }

    if (nodeId) {
      const { data: recentAttempts } = await db.from('curriculum_test_attempts').select('id,node_id,score,total_marks,correct_count,status,started_at,completed_at,created_at').eq('node_id', nodeId).order('created_at', { ascending: false }).limit(10);
      attempts = recentAttempts || [];
    }
  }

  const latestImportByBook = new Map<string, any>();
  for (const row of imports || []) if (row.book_id && !latestImportByBook.has(row.book_id)) latestImportByBook.set(row.book_id, row);

  const bookRows = (books || []).map((book: any) => ({ ...book, subject: Array.isArray(book.subjects) ? book.subjects[0] : book.subjects, latest_import: latestImportByBook.get(book.id) || null, subjects: undefined }));
  const nodeRows = (nodes || []).map((node: any) => { const book = Array.isArray(node.curriculum_books) ? node.curriculum_books[0] : node.curriculum_books; return { ...node, book: book ? { id: book.id, title: book.title, grade_level: book.grade_level, board: book.board, subject: Array.isArray(book.subjects) ? book.subjects[0] : book.subjects } : null, curriculum_books: undefined }; });

  return NextResponse.json({ books: bookRows, nodes: nodeRows, pages, blocks, examples, questions, concepts, prerequisites, attempts, imports, meta: { query: q, book_id: bookId || null, node_id: nodeId || null } });
}
