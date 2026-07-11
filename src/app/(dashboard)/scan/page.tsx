import { Metadata } from 'next';
import { VisionScanClient } from '@/components/features/vision/VisionScanClient';

export const metadata: Metadata = { title: 'Scan & Solve' };

export default function ScanPage() {
  return <VisionScanClient />;
}
