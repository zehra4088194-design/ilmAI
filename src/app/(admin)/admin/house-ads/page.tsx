import type { Metadata } from 'next';
import { HouseAdsManager } from '@/components/features/admin/house-ads/HouseAdsManager';

export const metadata: Metadata = { title: 'Admin - House Ads' };

export default function HouseAdsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">House Ads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Self-served banners promoting ilmai.store, with click-to-conversion tracking. Replaces Google AdSense.
        </p>
      </div>
      <HouseAdsManager />
    </div>
  );
}
