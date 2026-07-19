'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { savePersonalization, skipPersonalization } from './actions';

const ROLL_NUMBER_GRADES = ['GRADE_10', 'GRADE_11', 'GRADE_12', 'O_LEVEL', 'A_LEVEL'];

interface OnboardingSubject {
  id: string;
  name: string;
  isOptional: boolean;
}

interface PersonalizationModalProps {
  gradeLevel: string;
  subjects: OnboardingSubject[];
}

type SubjectCondition = 'strong' | 'steady' | 'needs-work';
type StepId = 'roll' | 'marks' | 'target' | 'condition' | 'subjects';

export function PersonalizationModal({
  gradeLevel,
  subjects,
}: PersonalizationModalProps) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hasFinished, setHasFinished] = useState(false);

  const [rollNumber, setRollNumber] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [targetMarks, setTargetMarks] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectConditions, setSubjectConditions] = useState<Record<string, SubjectCondition>>({});
  const optionalSubjects = subjects.filter((subject) => subject.isOptional);

  const steps = useMemo(() => {
    const nextSteps: StepId[] = [];
    if (ROLL_NUMBER_GRADES.includes(gradeLevel)) nextSteps.push('roll');
    nextSteps.push('marks', 'target');
    if (subjects.length > 0) nextSteps.push('condition');
    if (optionalSubjects.length > 0) nextSteps.push('subjects');
    return nextSteps;
  }, [gradeLevel, optionalSubjects.length, subjects.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  function close() {
    setHasFinished(true);
    setOpen(false);
  }

  function finish() {
    startTransition(async () => {
      await savePersonalization({
        previousRollNumber: rollNumber || undefined,
        totalMarksPercentage: totalMarks ? Number(totalMarks) : undefined,
        targetMarksPercentage: targetMarks ? Number(targetMarks) : undefined,
        optionalSubjectIds: selectedSubjects.length ? selectedSubjects : undefined,
        subjectConditionBaseline: Object.keys(subjectConditions).length ? subjectConditions : undefined,
      });
      close();
    });
  }

  function skipAll() {
    if (hasFinished || isPending) return;
    startTransition(async () => {
      await skipPersonalization();
      close();
    });
  }

  function next() {
    if (isLastStep) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((subjectId) => subjectId !== id) : [...prev, id]
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && skipAll()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tell us a little more</DialogTitle>
          <DialogDescription>
            This helps us personalize your experience. Everything is optional, so share only what you want.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {currentStep === 'roll' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Do you remember your previous roll number?
              </label>
              <p className="text-xs text-muted-foreground">
                This helps us keep your previous progress connected.
              </p>
              <Input
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 12345"
              />
            </div>
          )}

          {currentStep === 'marks' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                What percentage did you score last time?
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 78"
              />
            </div>
          )}

          {currentStep === 'target' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                What is your target this time?
              </label>
              <p className="text-xs text-muted-foreground">
                No pressure. Choose a number that motivates you.
              </p>
              <Input
                type="number"
                min={0}
                max={100}
                value={targetMarks}
                onChange={(e) => setTargetMarks(e.target.value)}
                placeholder="e.g. 90"
              />
            </div>
          )}

          {currentStep === 'subjects' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Which optional subjects are you taking?
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {optionalSubjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'condition' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Describe your current level in each subject</label>
                <p className="text-muted-foreground mt-1 text-xs">
                  This is your starting baseline; progress graphs will measure improvement from here.
                </p>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {subjects.map((subject) => (
                  <div key={subject.id} className="border-border/70 rounded-xl border p-3">
                    <p className="mb-2 text-sm font-semibold">{subject.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['strong', 'Strong'],
                        ['steady', 'Steady'],
                        ['needs-work', 'Needs focus'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSubjectConditions((current) => ({ ...current, [subject.id]: value }))}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                            subjectConditions[subject.id] === value
                              ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                              : 'border-border bg-muted/25 text-muted-foreground hover:bg-muted/60'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={skipAll} disabled={isPending}>
            Skip
          </Button>
          <Button size="sm" onClick={next} disabled={isPending}>
            {isPending ? 'Saving...' : isLastStep ? 'Done' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
