import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure a profile row exists (for OAuth sign-ups that skip our register form)
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: data.user.id, email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          avatar_url: data.user.user_metadata?.avatar_url || null,
          subscription_tier: 'FREE', xp: 0, level: 1, streak: 0, total_study_time: 0,
          is_email_verified: !!data.user.email_confirmed_at, is_profile_complete: false, onboarding_step: 0,
        });
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
