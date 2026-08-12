import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMembershipRedirect } from '@/lib/auth/resolveMembershipRedirect';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ destination: '/dashboard' });

  const { destination } = await resolveMembershipRedirect(supabase, user.id);
  return NextResponse.json({ destination });
}
