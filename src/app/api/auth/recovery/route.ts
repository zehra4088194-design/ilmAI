import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestSiteUrl(request);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/forgot-password?error=invalid_recovery_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired_recovery_link`);
  }

  return NextResponse.redirect(`${origin}/reset-password`);
}
