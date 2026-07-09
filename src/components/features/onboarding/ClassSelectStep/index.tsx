'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '@/app/onboarding/class/actions';
import {
  CLASS_SELECTION_OPTIONS,
  type GradeLevel,
} from '@/lib/supabase/getUserGradeLevel';
import { Card, CardContent } from '@/components/ui/card';

export function ClassSelectStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<GradeLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(gradeLevel: GradeLevel) {
    if (isPending) return;

    setSelected(gradeLevel);
    setError(null);

    startTransition(async () => {
      const result = await completeOnboarding(gradeLevel);

      if (!result.success) {
        setError(result.error ?? 'Kuch masla ho gaya. Please try again.');
        setSelected(null);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Aap kis class mein hain?
          </h1>
          <p className="text-sm text-muted-foreground">
            Ye sirf ek dafa poocha jayega. Baad mein Settings se change kar sakte hain.
          </p>
        </div>

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
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border',
                  isDisabled ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                <CardContent className="flex flex-col items-center gap-1 p-0">
                  <span className="text-3xl font-bold text-foreground">
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {option.sublabel}
                  </span>
                  {isSelected && isPending && (
                    <span className="mt-2 text-xs font-medium text-primary">
                      Save ho raha hai...
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Aapki class ke mutabiq essays, guess papers aur resources dikhaye jayenge.
        </p>
      </div>
    </div>
  );
}
