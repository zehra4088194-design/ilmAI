import {
  Atom,
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Heart,
  HeartPulse,
  Pill,
  Scale,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';

// Deterministic icon-by-keyword mapping for subject tiles — the admin CMS doesn't
// have an icon picker (keeps that form simple), so this infers a reasonable icon
// from the subject name instead of every subject defaulting to the same generic icon.
const KEYWORD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/organic|inorganic|chemistry/i, FlaskConical],
  [/bio\s*chem|biochem/i, Dna],
  [/anatom|histolog|cardio|heart/i, Heart],
  [/physiolog/i, HeartPulse],
  [/pharma|drug|dose|dosage/i, Pill],
  [/physics|mechanic/i, Atom],
  [/math|calculus|statistic/i, Calculator],
  [/law|ethic|jurisprudence/i, Scale],
  [/clinical|patient|medicine/i, Stethoscope],
];

export function subjectIconFor(name: string): LucideIcon {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(name));
  return match ? match[1] : BookOpen;
}
