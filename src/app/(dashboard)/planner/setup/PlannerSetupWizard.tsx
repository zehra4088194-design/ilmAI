'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createStudyPlan } from '../actions';

type Subject = { id: string; name: string };

export function PlannerSetupWizard({
  subjects,
  preferredStudyTime,
}: {
  subjects: Subject[];
  preferredStudyTime?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [examDate, setExamDate] = useState('');
  const [focusSubjectIds, setFocusSubjectIds] = useState<string[]>(subjects.slice(0, 3).map((subject) => subject.id));
  const [dailyAvailableHours, setDailyAvailableHours] = useState(2);
  const [studyTime, setStudyTime] = useState(preferredStudyTime || 'evening');
  const [schoolTiming, setSchoolTiming] = useState('');
  const [coachingTiming, setCoachingTiming] = useState('');
  const [quietHours, setQuietHours] = useState('');

  const toggleSubject = (subjectId: string) => {
    setFocusSubjectIds((current) =>
      current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId]
    );
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createStudyPlan({
        examDate: examDate || null,
        focusSubjectIds,
        dailyAvailableHours,
        preferredStudyTime: studyTime,
        constraints: {
          school_timings: schoolTiming || null,
          coaching_timings: coachingTiming || null,
          quiet_hours: quietHours || null,
        },
      });
      if (result.status === 'success') {
        toast.success('Study plan generated');
        router.push('/planner/today');
      } else {
        toast.error(result.error || 'The plan could not be generated.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={`h-1 flex-1 rounded-full ${item <= step ? 'bg-primary' : 'bg-muted'} ${item > 0 ? 'ml-2' : ''}`} />
        ))}
      </div>

      <div className="glass rounded-xl p-5 md:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-400"><Calendar className="h-4 w-4" /> Exam focus</p>
              <h1 className="mt-1 text-2xl font-bold">When is your exam?</h1>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Exam date</Label>
              <Input id="exam-date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Subjects to focus on</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <Checkbox checked={focusSubjectIds.includes(subject.id)} onCheckedChange={() => toggleSubject(subject.id)} />
                    {subject.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-400"><Clock className="h-4 w-4" /> Daily rhythm</p>
              <h1 className="mt-1 text-2xl font-bold">How much time can you study?</h1>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Daily available hours</Label>
              <Input id="hours" type="number" min="0.5" max="12" step="0.5" value={dailyAvailableHours} onChange={(event) => setDailyAvailableHours(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="study-time">Preferred study time</Label>
              <select id="study-time" value={studyTime} onChange={(event) => setStudyTime(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-violet-400">Optional constraints</p>
              <h1 className="mt-1 text-2xl font-bold">Any blocked times?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Skip anything that does not apply.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">School timings</Label>
              <Input id="school" placeholder="8:00 AM - 2:00 PM" value={schoolTiming} onChange={(event) => setSchoolTiming(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coaching">Coaching timings</Label>
              <Input id="coaching" placeholder="5:00 PM - 7:00 PM" value={coachingTiming} onChange={(event) => setCoachingTiming(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet">Quiet hours</Label>
              <Input id="quiet" placeholder="10:30 PM - 6:00 AM" value={quietHours} onChange={(event) => setQuietHours(event.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-violet-400">Review</p>
              <h1 className="mt-1 text-2xl font-bold">Generate your plan</h1>
            </div>
            <div className="grid gap-3 text-sm">
              <Review label="Exam date" value={examDate || 'Flexible'} />
              <Review label="Daily time" value={`${dailyAvailableHours} hours`} />
              <Review label="Preferred time" value={studyTime} />
              <Review label="Focus subjects" value={`${focusSubjectIds.length || subjects.length} selected`} />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={step === 0 || pending} onClick={() => setStep((value) => Math.max(0, value - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" variant="gradient" onClick={() => setStep((value) => Math.min(3, value + 1))}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="gradient" disabled={pending} onClick={submit}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}
