import { Metadata } from 'next';
import { DownloadsClient } from '@/components/features/offline/DownloadsClient';

export const metadata: Metadata = { title: 'Downloads' };

export default function DownloadsPage() {
  return <DownloadsClient />;
}
