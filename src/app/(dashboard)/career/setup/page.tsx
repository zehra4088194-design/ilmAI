import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CareerSetupWizard } from './CareerSetupWizard';

export const metadata: Metadata = { title: 'Career Setup' };

export default async function CareerSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: existing } = await supabase.from('career_profile_inputs' as any).select('*').eq('student_id', user!.id).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">AI Career Counselor</p>
        <h1 className="mt-1 text-2xl font-bold">Career profile setup</h1>
      </div>
      <CareerSetupWizard existing={existing || null} />
    </div>
  );
}
