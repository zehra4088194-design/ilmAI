import { BrandLoader } from '@/components/ui/BrandLoader';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <BrandLoader label="Page load ho rahi hai..." className="min-h-screen" />
    </div>
  );
}
