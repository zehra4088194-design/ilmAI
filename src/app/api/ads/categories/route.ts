import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listCategories } from '@/lib/ads/queries';

export const runtime = 'nodejs';

// Read-only, any logged-in user (admin or seller banner forms both call this to populate the
// category picker) — the list itself is non-sensitive. Managing it (add/remove) is admin-only,
// under /api/admin/ads/categories.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  return NextResponse.json({ categories: await listCategories() });
}
