import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fonboarding%2Fclass');
  }

  // Kept as a compatibility route for older links/bookmarks. All current
  // student completion now lives in one compact study-setup screen.
  redirect('/onboarding/class');
}
