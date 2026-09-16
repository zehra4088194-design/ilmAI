import type { ReactNode } from 'react';
import { CurriculumUiGate } from '@/components/features/curriculum/CurriculumUiGate';

export default function CurriculumLayout({ children }: { children: ReactNode }) {
  return <CurriculumUiGate>{children}</CurriculumUiGate>;
}
