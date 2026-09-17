import { Metadata } from 'next';
import Link from 'next/link';
import { PlatformSettingsForm } from '@/components/features/admin/settings/PlatformSettingsForm';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { Button } from '@/components/ui/button';
export const metadata: Metadata = { title: 'Admin - Settings' };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/settings/curriculum">Curriculum / Smart Book</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/teacher-plans">Teacher Plans & Student Limits</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/institution-plans">Institution Student Plans</Link></Button>
        </div>
      </div>
      <PlatformSettingsForm initialSettings={settings} />
    </div>
  );
}
