import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityToolClient } from '@/components/features/university/UniversityToolClient';

export const metadata: Metadata = { title: 'Viva Practice' };

export default async function VivaPracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('university_courses, preferred_output_style').eq('id', user!.id).single();
  return <UniversityToolClient tool="viva" title="Viva Preparation Mode" description="Practice basic, intermediate and difficult viva questions with short model answers and follow-ups." defaultSubject={profile?.university_courses?.[0] || ''} defaultStyle={profile?.preferred_output_style || 'simple'} />;
}
