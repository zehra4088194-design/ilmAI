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

interface OptionalSubject {
  id: string;
  name: string;
}

interface PersonalizationModalProps {
  gradeLevel: string;
  optionalSubjects: OptionalSubject[];
}

type StepId = 'roll' | 'marks' | 'target' | 'subjects';

export function PersonalizationModal({
  gradeLevel,
  optionalSubjects,
}: PersonalizationModalProps) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [hasFinished, setHasFinished] = useState(false);

  const [rollNumber, setRollNumber] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [targetMarks, setTargetMarks] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const steps = useMemo(() => {
    const nextSteps: StepId[] = [];
    if (ROLL_NUMBER_GRADES.includes(gradeLevel)) nextSteps.push('roll');
    nextSteps.push('marks', 'target');
    if (optionalSubjects.length > 0) nextSteps.push('subjects');
    return nextSteps;
  }, [gradeLevel, optionalSubjects.length]);

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
          <DialogTitle>Thoda aur bata do</DialogTitle>
          <DialogDescription>
            Taake hum tumhari behtar madad kar saken. Sab kuch optional hai,
            jitna chaho utna batao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {currentStep === 'roll' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Pichla roll number yaad hai?
              </label>
              <p className="text-xs text-muted-foreground">
                Isse hum tumhara pichla progress yaad rakhne mein madad karenge.
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
                Pichli dafa kitne % aaye thay?
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
                Is dafa kitna target hai?
              </label>
              <p className="text-xs text-muted-foreground">
                Koi pressure nahi. Bas ek number jo tumhe motivate kare.
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
                Konse optional subjects le rahe ho?
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
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={skipAll} disabled={isPending}>
            Skip karo
          </Button>
          <Button size="sm" onClick={next} disabled={isPending}>
            {isPending ? 'Save ho raha hai...' : isLastStep ? 'Done' : 'Agla'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
