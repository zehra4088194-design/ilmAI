import { Metadata } from 'next';
import { DiagnosticClient } from '@/components/features/diagnostic/DiagnosticClient';

export const metadata: Metadata = { title: 'Starting Diagnostic' };

export default function DiagnosticPage() {
  return <DiagnosticClient />;
}
