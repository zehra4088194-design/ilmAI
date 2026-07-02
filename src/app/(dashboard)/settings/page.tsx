import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SettingsTabs } from '@/components/features/settings/SettingsTabs';
export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Apna account manage karo</p></div>
      <SettingsTabs profile={profile} />
    </div>
  );
}
