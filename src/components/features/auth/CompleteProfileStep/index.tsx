'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { completeProfile } from '@/app/onboarding/complete-profile/actions';

export function CompleteProfileStep() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [board, setBoard] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = board !== '' && gradeLevel !== '' && !isPending;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await completeProfile(board, gradeLevel);
      if (!result.success) {
        setError(result.error ?? 'Could not save your profile. Please try again.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Bas ek chhota sa step baaki hai
        </h1>
        <p className="text-sm text-muted-foreground">
          Apna board aur grade confirm kar do, phir dashboard tumhare syllabus
          ke mutabiq set ho jayega.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Board</label>
          <Select value={board} onValueChange={setBoard}>
            <SelectTrigger>
              <SelectValue placeholder="Apna board chuno" />
            </SelectTrigger>
            <SelectContent>
              {BOARDS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Grade</label>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Apni grade chuno" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isPending ? 'Save ho raha hai...' : 'Aage badho'}
        </Button>
      </div>
    </div>
  );
}
