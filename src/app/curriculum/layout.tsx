import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isCurriculumEnabled } from '@/lib/features/curriculum';

export default async function CurriculumLayout({ children }: { children: ReactNode }) {
  if (!(await isCurriculumEnabled())) notFound();
  return children;
}
