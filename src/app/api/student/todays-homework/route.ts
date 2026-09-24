import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/student/todays-homework
 * Returns today's homework with lecture annotations for the current student
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = supabase as any;

  // Check if user is a student
  const { data: membership } = await db
    .from('school_memberships')
    .select('member_role')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.member_role !== 'student') {
    return NextResponse.json({ error: 'Only students can view homework' }, { status: 403 });
  }

  // Use the RPC function to get today's homework with annotations
  const { data, error } = await db.rpc('student_today_homework', { p_student_id: user.id });

  if (error) {
    console.error('Error fetching today\'s homework:', error);
    return NextResponse.json({ error: 'Failed to load homework' }, { status: 500 });
  }

  return NextResponse.json({ homework: data || [] });
}
