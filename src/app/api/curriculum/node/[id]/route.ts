import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isCurriculumEnabled } from '@/lib/features/curriculum';

async function canReadBook(db: ReturnType<typeof createServiceClient>, userId: string, book: any) {
  if (book.scope_type === 'global') return true;
  if (!book.organization_id) return false;
  const table = book.scope_type === 'school' ? 'school_memberships' : 'college_memberships';
  const { data } = await db.from(table).select('id').eq('organization_id', book.organization_id).eq('profile_id', userId).eq('status', 'active').maybeSingle();
  return Boolean(data);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurriculumEnabled())) return NextResponse.json({ error: 'Curriculum is currently disabled.' }, { status: 404 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing node id.' }, { status: 400 });

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const db = createServiceClient();
  const { data: node, error } = await db.from('curriculum_nodes')
    .select('id,book_id,parent_id,node_type,number,title,slug,depth,sort_order,path_numbers,path_titles,raw_heading,source_page_start,source_page_end,is_published,metadata,curriculum_books!inner(id,title,subject_id,grade_level,board,curriculum,edition,publisher,language,status,scope_type,organization_id,source_file_url,subjects(name,slug))')
    .eq('id', id).eq('is_published', true).eq('curriculum_books.status', 'published').single();

  if (error || !node) return NextResponse.json({ error: 'Curriculum topic not found.' }, { status: 404 });
  const book = Array.isArray((node as any).curriculum_books) ? (node as any).curriculum_books[0] : (node as any).curriculum_books;
  if (!(await canReadBook(db, user.id, book))) return NextResponse.json({ error: 'You do not have access to this curriculum.' }, { status: 403 });

  const [{ data: content }, { data: examples }, { data: questions }, { data: children }, { data: concepts }] = await Promise.all([
    db.from('curriculum_content_blocks').select('id,block_type,ordinal,exact_text,normalized_text,source_page,source_page_end,source_label,metadata').eq('node_id', id).order('ordinal'),
    db.from('curriculum_examples').select('id,ordinal,title,exact_question,exact_solution,explanation,source_page,metadata').eq('node_id', id).order('ordinal'),
    db.from('curriculum_questions').select('id,question_type,ordinal,question_number,exercise_number,exact_text,options,marks,difficulty,source_page,metadata').eq('node_id', id).order('ordinal'),
    db.from('curriculum_nodes').select('id,node_type,number,title,slug,depth,sort_order,source_page_start,source_page_end,is_published').eq('book_id', node.book_id).eq('parent_id', id).eq('is_published', true).order('sort_order'),
    db.from('curriculum_concepts').select('id,subject_id,chapter_id,board,grade_level,slo_code,title,description,difficulty,order_index').eq('chapter_id', id).order('order_index'),
  ]);

  const conceptIds = (concepts || []).map((concept: any) => concept.id);
  let prerequisites: any[] = [];
  if (conceptIds.length) {
    const { data } = await db.from('curriculum_prerequisites').select('concept_id,prerequisite_concept_id,created_at').in('concept_id', conceptIds);
    prerequisites = data || [];
  }

  const subject = book?.subjects;
  return NextResponse.json({ node: {
    id: node.id, book_id: node.book_id, parent_id: node.parent_id, node_type: node.node_type, number: node.number, title: node.title, slug: node.slug, depth: node.depth, sort_order: node.sort_order,
    path_numbers: node.path_numbers, path_titles: node.path_titles, raw_heading: node.raw_heading, source_page_start: node.source_page_start, source_page_end: node.source_page_end, metadata: node.metadata,
    book: { id: book.id, title: book.title, grade_level: book.grade_level, board: book.board, curriculum: book.curriculum, edition: book.edition, publisher: book.publisher, language: book.language, source_file_url: book.source_file_url, subject: subject?.name || null, subject_slug: subject?.slug || null },
    content: content || [], examples: examples || [], questions: questions || [], children: children || [], concepts: concepts || [], prerequisites,
  } });
}
