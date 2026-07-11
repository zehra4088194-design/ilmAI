import { Metadata } from 'next';
import { PlatformSettingsForm } from '@/components/features/admin/settings/PlatformSettingsForm';
import { getPlatformSettings } from '@/lib/platform-settings/server';
export const metadata: Metadata = { title: 'Admin - Settings' };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Settings</h1>
      <PlatformSettingsForm initialSettings={settings} />
    </div>
  );
}
