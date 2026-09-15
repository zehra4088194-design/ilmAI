import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContext } from '@/lib/school-erp/access';

const STAFF_ROLES = new Set(['owner', 'admin', 'coordinator', 'admissions', 'teacher', 'staff', 'accountant']);

async function areParentStudentLinked(db: any, organizationId: string, parentId: string, studentId: string) {
  const { data } = await db.from('school_guardians').select('id').eq('organization_id', organizationId).eq('guardian_id', parentId).eq('student_id', studentId).maybeSingle();
  return Boolean(data);
}

function isAllowedRolePair(callerRole: string, targetRole: string) {
  if (callerRole === 'owner' || callerRole === 'admin') return true;
  if (callerRole === 'parent') return STAFF_ROLES.has(targetRole) || targetRole === 'student';
  if (callerRole === 'student') return STAFF_ROLES.has(targetRole) || targetRole === 'student' || targetRole === 'parent';
  return true;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const otherProfileId = String(body.otherProfileId || '').trim();
  if (!otherProfileId || otherProfileId === user.id) return NextResponse.json({ error: 'Choose another school member.' }, { status: 400 });

  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: 'School membership required.' }, { status: 403 });
  const db = supabase as any;
  const { data: target } = await db.from('school_memberships').select('profile_id, member_role').eq('organization_id', context.organization.id).eq('profile_id', otherProfileId).eq('status', 'active').maybeSingle();
  if (!target) return NextResponse.json({ error: 'That person is not an active member of this school.' }, { status: 403 });

  const callerRole = context.membership.member_role;
  if (!isAllowedRolePair(callerRole, target.member_role)) return NextResponse.json({ error: 'This school communication is not allowed for your role.' }, { status: 403 });
  if ((callerRole === 'parent' && target.member_role === 'student') || (callerRole === 'student' && target.member_role === 'parent')) {
    const parentId = callerRole === 'parent' ? user.id : otherProfileId;
    const studentId = callerRole === 'parent' ? otherProfileId : user.id;
    if (!(await areParentStudentLinked(db, context.organization.id, parentId, studentId))) return NextResponse.json({ error: 'Parent and student chats are only available for linked family members.' }, { status: 403 });
  }

  const { data: conversation, error } = await db.rpc('get_or_create_direct_conversation', {
    p_context_type: 'school',
    p_organization_id: context.organization.id,
    p_relationship_type: 'school_member',
    p_other_profile_id: otherProfileId,
  });
  if (error) return NextResponse.json({ error: error.message || 'Conversation could not be created.' }, { status: 500 });
  return NextResponse.json({ conversation });
}
