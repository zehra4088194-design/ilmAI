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
import { EDUCATION_LEVELS, OUTPUT_STYLES, type EducationLevel, type PreferredOutputStyle } from '@/lib/constants/university';

export function ClassSelectStep() {
  const router = useRouter();
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [selected, setSelected] = useState<GradeLevel | null>(null);
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [courses, setCourses] = useState('');
  const [examTargetDate, setExamTargetDate] = useState('');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>('simple');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(gradeLevel: GradeLevel) {
    if (isPending) return;

    setSelected(gradeLevel);
    setError(null);

    startTransition(async () => {
      const inferredLevel: EducationLevel = gradeLevel === 'GRADE_11' || gradeLevel === 'GRADE_12' ? 'college' : educationLevel;
      const result = await completeOnboarding(gradeLevel, inferredLevel);

      if (!result.success) {
        setError(result.error ?? 'Kuch masla ho gaya. Please try again.');
        setSelected(null);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    });
  }

  function handleUniversitySubmit() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await completeUniversityOnboarding({
        program,
        semester,
        courses: courses.split(','),
        examTargetDate: examTargetDate || null,
        preferredOutputStyle,
      });
      if (!result.success) {
        setError(result.error ?? 'University mode save nahi hua. Please try again.');
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
            Aap kis level par study kar rahe hain?
          </h1>
          <p className="text-sm text-muted-foreground">
            Ye sirf ek dafa poocha jayega. Baad mein Settings se change kar sakte hain.
          </p>
        </div>

        <div className="grid gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => {
                setEducationLevel(level.value);
                setError(null);
              }}
              className={[
                'rounded-xl border px-4 py-3 text-left transition-colors',
                educationLevel === level.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
              ].join(' ')}
            >
              <span className="block text-sm font-semibold">{level.label}</span>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </button>
          ))}
        </div>

        {educationLevel === 'university' ? (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <Input value={program} onChange={(event) => setProgram(event.target.value)} placeholder="Degree / Program, e.g. BS Psychology" />
            <Input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="Semester, e.g. Semester 3" />
            <Input value={courses} onChange={(event) => setCourses(event.target.value)} placeholder="Courses comma se likho" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={examTargetDate} onChange={(event) => setExamTargetDate(event.target.value)} />
              <select value={preferredOutputStyle} onChange={(event) => setPreferredOutputStyle(event.target.value as PreferredOutputStyle)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {OUTPUT_STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
              </select>
            </div>
            <Button onClick={handleUniversitySubmit} disabled={isPending || !program.trim() || !semester.trim()} className="w-full">
              {isPending ? 'Save ho raha hai...' : 'University Mode Start Karo'}
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
                    isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border',
                    isDisabled ? 'pointer-events-none opacity-50' : '',
                  ].join(' ')}
                >
                  <CardContent className="flex flex-col items-center gap-1 p-0">
                    <span className="text-3xl font-bold text-foreground">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.sublabel}</span>
                    {isSelected && isPending && <span className="mt-2 text-xs font-medium text-primary">Save ho raha hai...</span>}
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
          Aapki class ke mutabiq essays, guess papers aur resources dikhaye jayenge.
        </p>
      </div>
    </div>
  );
}
