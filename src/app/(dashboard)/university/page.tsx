import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityDashboard } from '@/components/features/dashboard/UniversityDashboard';

export const metadata: Metadata = { title: 'University Hub' };

export default async function UniversityIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  return <UniversityDashboard profile={profile} />;
}
