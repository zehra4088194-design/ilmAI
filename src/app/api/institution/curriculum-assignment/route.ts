import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const STAFF_ROLES = new Set(['teacher', 'admin', 'owner', 'coordinator', 'principal']);

async function getMembership(db: ReturnType<typeof createServiceClient>, userId: string, scope: string, organizationId?: string) {
  const table = scope === 'school' ? 'school_memberships' : 'college_memberships';
  let q = db.from(table).select('id,organization_id,member_role').eq('profile_id', userId).eq('status', 'active');
  if (organizationId) q = q.eq('organization_id', organizationId);
  const { data } = await q;
  return (data || []).find((m: any) => STAFF_ROLES.has(String(m.member_role || '').toLowerCase())) || null;
}

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') === 'college' ? 'college' : 'school';
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const db = createServiceClient();
  const membership = await getMembership(db, user.id, scope, req.nextUrl.searchParams.get('organization_id') || undefined);
  if (!membership) return NextResponse.json({ error: 'Institution teacher access required.' }, { status: 403 });

  const sectionsTable = scope === 'school' ? 'school_sections' : 'college_sections';
  const { data: sections, error } = await db.from(sectionsTable).select('id,name,organization_id').eq('organization_id', membership.organization_id).eq('is_active', true).order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization_id: membership.organization_id, sections: sections || [] });
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  const scope = body?.scope === 'college' ? 'college' : 'school';
  const sectionId = String(body?.section_id || '');
  const nodeId = String(body?.node_id || '');
  if (!sectionId || !nodeId) return NextResponse.json({ error: 'section_id and node_id are required.' }, { status: 400 });

  const db = createServiceClient();
  const membership = await getMembership(db, user.id, scope, body?.organization_id || undefined);
  if (!membership) return NextResponse.json({ error: 'Institution teacher access required.' }, { status: 403 });

  const { data: node } = await db.from('curriculum_nodes').select('id,number,title,book_id,is_published,curriculum_books!inner(id,title,subject_id,grade_level,board,status,scope_type,organization_id)').eq('id', nodeId).eq('is_published', true).eq('curriculum_books.status', 'published').single();
  if (!node) return NextResponse.json({ error: 'Curriculum topic not found.' }, { status: 404 });

  const sectionsTable = scope === 'school' ? 'school_sections' : 'college_sections';
  const { data: section } = await db.from(sectionsTable).select('id,name,organization_id').eq('id', sectionId).eq('organization_id', membership.organization_id).eq('is_active', true).single();
  if (!section) return NextResponse.json({ error: 'Section is not part of your institution.' }, { status: 403 });

  const book = Array.isArray((node as any).curriculum_books) ? (node as any).curriculum_books[0] : (node as any).curriculum_books;
  const snapshot = { node_id: node.id, number: node.number, title: node.title, book_id: book.id, book_title: book.title, grade_level: book.grade_level, board: book.board };
  const title = String(body?.title || `${node.number ? `${node.number} ` : ''}${node.title}`);
  const instructions = String(body?.instructions || `Study ${snapshot.number || ''} ${snapshot.title} from ${snapshot.book_title}.`).trim();
  const dueAt = body?.due_at ? new Date(body.due_at).toISOString() : null;
  const maxMarks = body?.max_marks == null || body.max_marks === '' ? null : Number(body.max_marks);
  if (maxMarks !== null && (!Number.isFinite(maxMarks) || maxMarks < 0)) return NextResponse.json({ error: 'Invalid max_marks.' }, { status: 400 });

  const table = scope === 'school' ? 'school_homework' : 'college_assignments';
  const row: any = {
    organization_id: membership.organization_id,
    section_id: sectionId,
    title,
    instructions,
    assigned_on: new Date().toISOString().slice(0, 10),
    due_at: dueAt,
    max_marks: maxMarks,
    created_by: user.id,
    curriculum_node_id: node.id,
    curriculum_snapshot: snapshot,
  };
  const { data: assignment, error } = await db.from(table).insert(row).select('id,title,section_id,due_at,curriculum_node_id,curriculum_snapshot').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, assignment, section });
}
