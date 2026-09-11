import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/school/lecture-annotations
 * Create a new lecture annotation (teacher only)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const body = await req.json();
  const { organizationId, sectionId, activityType, topic, summary, photoUrl, highlightColor, chapterId, highlightedRegions } = body;

  if (!organizationId || !sectionId || !topic) {
    return NextResponse.json({ error: 'Organization, section, and topic are required' }, { status: 400 });
  }

  if (!['test', 'lesson_reading'].includes(activityType)) {
    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
  }

  const db = supabase as any;

  // Check if user is a teacher/admin/owner in this org
  const { data: membership } = await db
    .from('school_memberships')
    .select('member_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || !['owner', 'admin', 'teacher'].includes(membership.member_role)) {
    return NextResponse.json({ error: 'Only teachers can create lecture annotations' }, { status: 403 });
  }

  const { data, error } = await db
    .from('school_lecture_annotations')
    .insert({
      organization_id: organizationId,
      section_id: sectionId,
      activity_type: activityType,
      topic,
      summary: summary?.slice(0, 3000) || null,
      photo_url: photoUrl || null,
      highlight_color: highlightColor || null,
      chapter_id: chapterId || null,
      highlighted_regions: Array.isArray(highlightedRegions) ? highlightedRegions : [],
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating lecture annotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create annotation' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
