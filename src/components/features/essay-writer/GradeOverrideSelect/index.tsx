'use client';

import { GRADE_SHORT_LABEL, type GradeLevel } from '@/lib/utils/buildGradeContext';

const GRADE_OPTIONS: readonly GradeLevel[] = ['GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'];

interface GradeOverrideSelectProps {
  value: GradeLevel;
  profileGradeLevel: GradeLevel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (gradeLevel: GradeLevel) => void;
}

export function GradeOverrideSelect({
  value,
  profileGradeLevel,
  open,
  onOpenChange,
  onChange,
}: GradeOverrideSelectProps) {
  if (!open) {
    const isCustom = value !== profileGradeLevel;
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Grade {GRADE_SHORT_LABEL[value]}
        {isCustom ? ' (custom)' : ''} · Change
      </button>
    );
  }

  return (
    <select
      autoFocus
      value={value}
      onBlur={() => onOpenChange(false)}
      onChange={(event) => {
        onChange(event.target.value as GradeLevel);
        onOpenChange(false);
      }}
      className="h-7 w-[170px] rounded-md border border-input bg-background px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
    >
      {GRADE_OPTIONS.map((option) => (
        <option key={option} value={option}>
          Grade {GRADE_SHORT_LABEL[option]}
          {option === profileGradeLevel ? ' (your class)' : ''}
        </option>
      ))}
    </select>
  );
}
