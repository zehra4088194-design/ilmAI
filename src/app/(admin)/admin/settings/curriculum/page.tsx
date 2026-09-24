import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CurriculumFeatureToggle } from '@/components/features/admin/settings/CurriculumFeatureToggle';
import { isCurriculumEnabled } from '@/lib/features/curriculum';

export const metadata: Metadata = { title: 'Admin - Curriculum Feature' };

export default async function AdminCurriculumFeaturePage() {
  const enabled = await isCurriculumEnabled();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Curriculum / Smart Book Practice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep this disabled until the textbook curriculum feature is ready for users.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/settings">← Platform settings</Link>
        </Button>
      </div>

      <CurriculumFeatureToggle initialEnabled={enabled} />
    </div>
  );
}
