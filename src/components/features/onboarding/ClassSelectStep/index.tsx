'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding, completeUniversityOnboarding } from '@/app/onboarding/class/actions';
import {
  CLASS_SELECTION_OPTIONS,
  type GradeLevel,
} from '@/lib/supabase/getUserGradeLevel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EducationLevel } from '@/lib/constants/university';

export function ClassSelectStep({
  educationLevel = 'school',
}: {
  educationLevel?: EducationLevel;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<GradeLevel | null>(null);
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(gradeLevel: GradeLevel) {
    if (isPending) return;
    setSelected(gradeLevel);
    setError(null);

    startTransition(async () => {
      const result = await completeOnboarding(gradeLevel);
      if (!result.success) {
        setError(result.error ?? 'Something went wrong. Please try again.');
        setSelected(null);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    });
  }

  function handleUniversitySubmit() {
    if (isPending) return;
    if (!program.trim() || !semester.trim()) {
      setError('Enter your degree/program and semester.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await completeUniversityOnboarding({
        program,
        semester,
        courses: [],
        examTargetDate: null,
        preferredOutputStyle: 'simple',
      });

      if (!result.success) {
        setError(result.error ?? 'University setup could not be saved. Please try again.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {educationLevel === 'university' ? 'Set up University Hub' : 'What class are you studying in?'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {educationLevel === 'university'
              ? 'Just your degree and semester. You can add more details later.'
              : 'Choose your class. Board selection is not required.'}
          </p>
        </div>

        {educationLevel === 'university' ? (
          <div className="space-y-4">
            <Input
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              placeholder="Degree / Program, e.g. BS Computer Science"
            />
            <Input
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              placeholder="Semester, e.g. Semester 3"
            />
            <Button onClick={handleUniversitySubmit} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Start University Hub'}
            </Button>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-4"
            role="radiogroup"
            aria-label="Select your class"
          >
            {CLASS_SELECTION_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              const isDisabled = isPending && !isSelected;

              return (
                <Card
                  key={option.value}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => !isDisabled && handleSelect(option.value)}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && !isDisabled) {
                      event.preventDefault();
                      handleSelect(option.value);
                    }
                  }}
                  className={[
                    'cursor-pointer select-none border-2 py-8 text-center transition-all',
                    'hover:border-primary hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected ? 'border-primary bg-primary/20 shadow-md' : 'border-border bg-card/80',
                    isDisabled ? 'pointer-events-none opacity-50' : '',
                  ].join(' ')}
                >
                  <CardContent className="flex flex-col items-center gap-1 p-0">
                    <span className="text-3xl font-bold text-foreground">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.sublabel}</span>
                    {isSelected && isPending && (
                      <span className="mt-2 text-xs font-medium text-primary">Saving...</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {educationLevel === 'university'
            ? 'University resources and tools will use this setup.'
            : 'Your class will control which school-level resources are shown.'}
        </p>
      </div>
    </div>
  );
}
