import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveMembershipRedirect } from '@/lib/auth/resolveMembershipRedirect';

export async function GET(request: NextRequest) {
  const redirectParam = new URL(request.url).searchParams.get('redirect');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const fallback =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/dashboard';
    return NextResponse.json({ destination: fallback });
  }

  const { destination } = await resolveMembershipRedirect(supabase, user.id, redirectParam);
  return NextResponse.json({ destination });
}
