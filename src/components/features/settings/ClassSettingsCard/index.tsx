'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setGradeLevel } from '@/app/onboarding/class/actions';
import {
  CLASS_SELECTION_GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  type ClassSelectionGradeLevel,
} from '@/lib/supabase/getUserGradeLevel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClassSettingsCardProps {
  currentGradeLevel: ClassSelectionGradeLevel;
  onClassChange?: (gradeLevel: ClassSelectionGradeLevel, educationLevel: string) => void;
}

export function ClassSettingsCard({ currentGradeLevel, onClassChange }: ClassSettingsCardProps) {
  const router = useRouter();
  const [displayedGrade, setDisplayedGrade] = useState(currentGradeLevel);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ClassSelectionGradeLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDisplayedGrade(currentGradeLevel);
  }, [currentGradeLevel]);

  function openDialogFor(gradeLevel: ClassSelectionGradeLevel) {
    setPendingGrade(gradeLevel);
    setError(null);
    setDialogOpen(true);
  }

  function handleConfirm() {
    if (!pendingGrade) return;

    startTransition(async () => {
      const result = await setGradeLevel(pendingGrade);

      if (!result.success) {
        setError(result.error ?? 'The update could not be completed. Please try again.');
        setDialogOpen(false);
        return;
      }

      setDisplayedGrade(pendingGrade);
      onClassChange?.(pendingGrade, result.data?.educationLevel ?? (pendingGrade === 'GRADE_11' || pendingGrade === 'GRADE_12' ? 'college' : 'school'));
      setDialogOpen(false);
      setPendingGrade(null);
      router.refresh();
    });
  }

  function handleCancel() {
    setDialogOpen(false);
    setPendingGrade(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Class</p>
            <p className="text-lg font-medium text-foreground">
              {GRADE_LEVEL_LABELS[displayedGrade]}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              const firstOther = CLASS_SELECTION_GRADE_LEVELS.find(
                (gradeLevel) => gradeLevel !== displayedGrade
              );
              if (firstOther) openDialogFor(firstOther);
            }}
          >
            Change
          </Button>
        </CardContent>
        {error && (
          <CardContent className="pt-0">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          </CardContent>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change your class?</DialogTitle>
            <DialogDescription>
              Changing your class will update defaults across the app. Continue?
            </DialogDescription>
          </DialogHeader>

          <div
            className="grid grid-cols-2 gap-2 py-2"
            role="radiogroup"
            aria-label="Select new class"
          >
            {CLASS_SELECTION_GRADE_LEVELS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={pendingGrade === option}
                onClick={() => setPendingGrade(option)}
                className={[
                  'rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  pendingGrade === option
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/50',
                ].join(' ')}
              >
                {GRADE_LEVEL_LABELS[option]}
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || !pendingGrade || pendingGrade === displayedGrade}
            >
              {isPending ? 'Updating...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
