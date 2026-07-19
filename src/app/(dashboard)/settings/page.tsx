import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/features/settings/SettingsTabs';
import { getUserGradeLevel } from '@/lib/supabase/getUserGradeLevel';
export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; linkId?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { gradeLevel } = await getUserGradeLevel(supabase, user!.id);
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>
      <SettingsTabs
        profile={profile}
        currentGradeLevel={gradeLevel}
        initialTab={params?.tab}
        initialLinkId={params?.linkId}
        initialParentView={params?.view === 'files' ? 'files' : params?.view === 'chat' ? 'chat' : undefined}
      />
    </div>
  );
}
