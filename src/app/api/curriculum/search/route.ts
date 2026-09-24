import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isCurriculumEnabled } from '@/lib/features/curriculum';

export async function GET(req: NextRequest) {
  if (!(await isCurriculumEnabled())) return NextResponse.json({ error: 'Curriculum is currently disabled.' }, { status: 404 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const grade = req.nextUrl.searchParams.get('grade')?.trim() || '';
  const subjectId = req.nextUrl.searchParams.get('subject_id')?.trim() || '';
  const bookId = req.nextUrl.searchParams.get('book_id')?.trim() || '';
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 30), 1), 100);

  if (q.length < 1 && !grade && !subjectId && !bookId) {
    return NextResponse.json({ results: [] });
  }

  const db = createServiceClient();
  let query = db
    .from('curriculum_nodes')
    .select('id,book_id,parent_id,node_type,number,title,slug,depth,sort_order,path_numbers,path_titles,source_page_start,source_page_end,is_published,curriculum_books!inner(id,title,subject_id,grade_level,board,status,scope_type,organization_id,subjects(name,slug))')
    .eq('is_published', true)
    .eq('curriculum_books.status', 'published')
    .limit(limit);

  if (bookId) query = query.eq('book_id', bookId);
  if (grade) query = query.eq('curriculum_books.grade_level', grade);
  if (subjectId) query = query.eq('curriculum_books.subject_id', subjectId);

  if (q) {
    const escaped = q.replace(/[,%]/g, ' ');
    query = query.or(`number.ilike.%${escaped}%,title.ilike.%${escaped}%,path_numbers.ilike.%${escaped}%,path_titles.ilike.%${escaped}%`);
  }

  const { data, error } = await query.order('depth').order('sort_order');
  if (error) {
    console.error('[curriculum/search]', error);
    return NextResponse.json({ error: 'Unable to search curriculum.' }, { status: 500 });
  }

  const results = (data || []).map((node: any) => {
    const book = Array.isArray(node.curriculum_books) ? node.curriculum_books[0] : node.curriculum_books;
    const subject = book?.subjects;
    return {
      id: node.id,
      type: node.node_type,
      number: node.number,
      name: node.title,
      title: node.title,
      book: book?.title || 'Book',
      book_id: node.book_id,
      subject: subject?.name || null,
      subject_slug: subject?.slug || null,
      grade_level: book?.grade_level || null,
      board: book?.board || null,
      path_numbers: node.path_numbers,
      path_titles: node.path_titles,
      pages: node.source_page_start
        ? node.source_page_end && node.source_page_end !== node.source_page_start
          ? `${node.source_page_start}-${node.source_page_end}`
          : String(node.source_page_start)
        : null,
      href: `/curriculum/${node.id}`,
    };
  });

  return NextResponse.json({ results });
}
