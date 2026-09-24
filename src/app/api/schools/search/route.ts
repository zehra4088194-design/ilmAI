import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getActiveSchools } from '@/lib/school-erp/queries';

// school_organizations RLS only allows members to SELECT their own
// organization (see "school organizations visible to members" in
// supabase/migrations/20260727100000_school_erp_core.sql), unlike the
// public college_organizations read policy — so this pre-auth signup
// lookup has to go through the service-role client, same as
// /api/auth/check-username.
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('q')?.trim() || '';
  const admin = await createAdminClient();
  const schools = await getActiveSchools(admin as any, search);
  return NextResponse.json({ schools: schools.slice(0, 20) });
}
