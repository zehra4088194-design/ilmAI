'use client';

import { Button } from '@/components/ui/button';
import { GRADE_SHORT_LABEL, type GradeLevel } from '@/lib/utils/buildGradeContext';

interface EssayClassBannerProps {
  gradeLevel: GradeLevel;
  onChangeClick: () => void;
}

export function EssayClassBanner({ gradeLevel, onChangeClick }: EssayClassBannerProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <span>Yeh essay Grade {GRADE_SHORT_LABEL[gradeLevel]} ke hisaab se likhi gayi hai</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs font-medium"
        onClick={onChangeClick}
      >
        Change
      </Button>
    </div>
  );
}
