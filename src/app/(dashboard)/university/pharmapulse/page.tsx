import { Metadata } from 'next';
import { PharmaPulseClient } from '@/components/features/university/PharmaPulseClient';

export const metadata: Metadata = { title: 'PharmaPulse' };

export default function PharmaPulsePage() {
  return <PharmaPulseClient />;
}
