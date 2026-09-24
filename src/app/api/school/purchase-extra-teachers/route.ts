import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/school/purchase-extra-teachers
 * Purchase additional teacher slots at PKR 100/teacher/month
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const body = await req.json();
  const { organizationId, extraCount } = body;

  if (!organizationId || !extraCount || extraCount < 1 || extraCount > 100) {
    return NextResponse.json({ error: 'Invalid number of extra teachers (1-100)' }, { status: 400 });
  }

  const db = supabase as any;

  // Check if user is admin/owner
  const { data: membership } = await db
    .from('school_memberships')
    .select('member_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.member_role)) {
    return NextResponse.json({ error: 'Only admins can purchase extra teachers' }, { status: 403 });
  }

  // Get current plan settings
  const { data: planSettings } = await db
    .from('school_organization_plan_settings')
    .select('max_teachers, monthly_price_pkr')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!planSettings) {
    return NextResponse.json({ error: 'Plan settings not found' }, { status: 404 });
  }

  // Calculate cost
  const costPerTeacher = 100; // PKR 100 per teacher
  const totalCost = extraCount * costPerTeacher;

  // Update max_teachers
  const newMaxTeachers = planSettings.max_teachers + extraCount;
  const newMonthlyPricePkr = (planSettings.monthly_price_pkr || 0) + totalCost;

  const { error } = await db
    .from('school_organization_plan_settings')
    .update({
      max_teachers: newMaxTeachers,
      monthly_price_pkr: newMonthlyPricePkr,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error updating teacher limits:', error);
    return NextResponse.json({ error: 'Failed to update teacher limits' }, { status: 500 });
  }

  // Log the transaction
  await db.from('school_audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action: 'purchase_extra_teachers',
    entity_type: 'teacher_slots',
    entity_id: organizationId,
    metadata: {
      extraCount,
      costPerTeacher,
      totalCost,
      newMaxTeachers,
      newMonthlyPricePkr,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Successfully added ${extraCount} extra teacher slot(s)!`,
    extraCount,
    totalCost,
    newMaxTeachers,
  });
}
