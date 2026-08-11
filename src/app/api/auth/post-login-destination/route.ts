import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContext, schoolAdminHomeForRole } from '@/lib/school-erp/access';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ destination: '/dashboard' });

  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ destination: '/dashboard' });

  return NextResponse.json({ destination: schoolAdminHomeForRole(context.membership.member_role) });
}
