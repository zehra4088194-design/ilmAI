import type { Metadata } from 'next';
import { PresentationBackgroundManager } from '@/components/features/admin/presentation-backgrounds/PresentationBackgroundManager';

export const metadata: Metadata = { title: 'Admin - Presentation Backgrounds' };

export default function PresentationBackgroundsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Presentation Backgrounds</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage the image library stored persistently on Oracle.</p>
      </div>
      <PresentationBackgroundManager />
    </div>
  );
}
