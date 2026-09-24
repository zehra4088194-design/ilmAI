import { Metadata } from 'next';
import { VisionScanClient } from '@/components/features/vision/VisionScanClient';
import { OnlineOnlyGate } from '@/components/features/offline/OnlineOnlyGate';

export const metadata: Metadata = { title: 'Scan & Solve' };

export default function ScanPage() {
  return (
    <OnlineOnlyGate feature="Scan & Solve" description="Scanning and solving needs a connection to read your photo.">
      <VisionScanClient />
    </OnlineOnlyGate>
  );
}
