import type { ReactElement } from 'react';
import { ClassicTable } from './ClassicTable';
import { ModernCard } from './ModernCard';
import { GradeFocused } from './GradeFocused';
import { GpaFocused } from './GpaFocused';
import type { ReportCardData } from './types';

export type { ReportCardData, ReportCardSubject } from './types';

export type ReportCardTemplateKey = 'classic' | 'modern' | 'grade-focused' | 'gpa-focused';

export const REPORT_CARD_TEMPLATES: Array<{
  key: ReportCardTemplateKey;
  label: string;
  description: string;
  Component: (props: { data: ReportCardData }) => ReactElement;
}> = [
  { key: 'classic', label: 'Classic table', description: 'A plain, formal marks table — safest default for any board.', Component: ClassicTable },
  { key: 'modern', label: 'Modern card', description: 'Colorful subject chips, friendlier for younger grades.', Component: ModernCard },
  { key: 'grade-focused', label: 'Grade-focused', description: 'Big letter grade up front, marks table secondary.', Component: GradeFocused },
  { key: 'gpa-focused', label: 'GPA-focused', description: 'GPA headline with per-subject progress bars — fits college/senior grading.', Component: GpaFocused },
];

const DEFAULT_TEMPLATE = REPORT_CARD_TEMPLATES[0]!;

export function resolveReportCardTemplate(key: string | undefined) {
  return REPORT_CARD_TEMPLATES.find((template) => template.key === key) || DEFAULT_TEMPLATE;
}
