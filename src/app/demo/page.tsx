import { Metadata } from 'next';
import { DemoTestClient } from '@/components/features/demo/DemoTestClient';

export const metadata: Metadata = {
  title: 'Free Demo Test - ilm AI',
  description: 'Try a short ilm AI demo test without signup.',
};

export default function DemoPage() {
  return <DemoTestClient />;
}
