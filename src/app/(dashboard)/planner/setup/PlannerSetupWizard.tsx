'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Loader2, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createStudyPlan } from '../actions';

type Subject = { id: string; name: string };
const goals = [
  { id: 'exam', title: 'Ace an exam', text: 'Build toward a real exam or test date.', icon: GraduationCap },
  { id: 'catch-up', title: 'Catch up', text: 'Recover unfinished chapters and missed work.', icon: Target },
  { id: 'consistency', title: 'Build consistency', text: 'Create a sustainable daily study rhythm.', icon: Sparkles },
];

export function PlannerSetupWizard({ subjects, preferredStudyTime }: { subjects: Subject[]; preferredStudyTime?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [goal, setGoal] = useState('exam');
  const [examDate, setExamDate] = useState('');
  const [focusSubjectIds, setFocusSubjectIds] = useState<string[]>(subjects.slice(0, 3).map((subject) => subject.id));
  const [dailyAvailableHours, setDailyAvailableHours] = useState(2);
  const [studyTime, setStudyTime] = useState(preferredStudyTime || 'evening');
  const [schoolTiming, setSchoolTiming] = useState('');
  const [coachingTiming, setCoachingTiming] = useState('');
  const [quietHours, setQuietHours] = useState('');

  const toggleSubject = (subjectId: string) => setFocusSubjectIds((current) => current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId]);

  const submit = () => {
    if ((goal === 'exam' && !examDate) || focusSubjectIds.length === 0) {
      toast.error(goal === 'exam' ? 'Choose an exam date and at least one subject.' : 'Choose at least one subject.');
      return;
    }
    startTransition(async () => {
      const result = await createStudyPlan({
        examDate: examDate || null,
        focusSubjectIds,
        dailyAvailableHours,
        preferredStudyTime: studyTime,
        constraints: { goal, school_timings: schoolTiming || null, coaching_timings: coachingTiming || null, quiet_hours: quietHours || null },
      });
      if (result.status === 'success') { toast.success('Your smart plan is ready'); router.push('/planner/today'); }
      else toast.error(result.error || 'The plan could not be generated.');
    });
  };

  const labels = ['Goal', 'Subjects', 'Time', 'Schedule', 'Launch'];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 grid grid-cols-5 gap-2">
        {labels.map((label, index) => <div key={label} className="min-w-0"><div className={`h-1.5 rounded-full transition ${index <= step ? 'bg-primary' : 'bg-muted'}`} /><p className={`mt-2 truncate text-[11px] font-semibold ${index === step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p></div>)}
      </div>

      <div className="overflow-hidden rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 via-background to-sky-500/5 p-4 md:p-6">
        <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Brain className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-500">Smart planner setup</p><h1 className="text-xl font-bold md:text-2xl">Tell ilm AI how you study.</h1><p className="text-muted-foreground text-sm">We will turn your answers into an actionable plan.</p></div></div>

        <div className="rounded-2xl border bg-background/60 p-4 md:p-5">
          {step === 0 && <div className="space-y-5"><div><p className="text-sm font-semibold text-violet-500">01 · Choose your mission</p><h2 className="mt-1 text-2xl font-bold">What are you trying to achieve?</h2></div><div className="grid gap-3 md:grid-cols-3">{goals.map((item) => { const Icon = item.icon; const active = goal === item.id; return <button key={item.id} type="button" onClick={() => setGoal(item.id)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-violet-500 bg-violet-500/10 shadow-sm' : 'bg-background/40 hover:bg-muted/30'}`}><Icon className="h-5 w-5 text-violet-500" /><p className="mt-3 font-semibold">{item.title}</p><p className="text-muted-foreground mt-1 text-xs leading-5">{item.text}</p></button>; })}</div>{goal === 'exam' && <div className="space-y-2"><Label htmlFor="exam-date">Exam / test date</Label><Input id="exam-date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></div>}</div>}

          {step === 1 && <div className="space-y-5"><div><p className="text-sm font-semibold text-violet-500">02 · Pick your battlefield</p><h2 className="mt-1 text-2xl font-bold">Which subjects need your attention?</h2><p className="text-muted-foreground mt-1 text-sm">Start with your important subjects. Your plan can still use the rest later.</p></div><div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{subjects.map((subject) => <label key={subject.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${focusSubjectIds.includes(subject.id) ? 'border-violet-500 bg-violet-500/10' : 'bg-background/40 hover:bg-muted/30'}`}><Checkbox checked={focusSubjectIds.includes(subject.id)} onCheckedChange={() => toggleSubject(subject.id)} /><span className="text-sm font-medium">{subject.name}</span></label>)}</div><div className="text-xs text-muted-foreground">{focusSubjectIds.length} selected</div></div>}

          {step === 2 && <div className="space-y-5"><div><p className="flex items-center gap-2 text-sm font-semibold text-violet-500"><Clock3 className="h-4 w-4" />03 · Build your daily rhythm</p><h2 className="mt-1 text-2xl font-bold">How much real study time do you have?</h2></div><div className="rounded-2xl border bg-muted/15 p-4"><div className="flex items-end justify-between"><div><p className="text-muted-foreground text-sm">Daily capacity</p><p className="mt-1 text-3xl font-bold">{dailyAvailableHours}<span className="text-base text-muted-foreground"> h/day</span></p></div><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-500">Be realistic</span></div><input aria-label="Daily study hours" type="range" min="0.5" max="8" step="0.5" value={dailyAvailableHours} onChange={(event) => setDailyAvailableHours(Number(event.target.value))} className="mt-5 w-full accent-primary" /></div><div className="space-y-2"><Label htmlFor="study-time">Best study window</Label><select id="study-time" value={studyTime} onChange={(event) => setStudyTime(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="night">Night</option></select></div></div>}

          {step === 3 && <div className="space-y-5"><div><p className="flex items-center gap-2 text-sm font-semibold text-violet-500"><CalendarDays className="h-4 w-4" />04 · Protect your focus</p><h2 className="mt-1 text-2xl font-bold">When are you unavailable?</h2><p className="text-muted-foreground mt-1 text-sm">These windows help the planner avoid unrealistic sessions.</p></div><div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label htmlFor="school">School / college</Label><Input id="school" placeholder="8 AM - 2 PM" value={schoolTiming} onChange={(event) => setSchoolTiming(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="coaching">Coaching</Label><Input id="coaching" placeholder="5 PM - 7 PM" value={coachingTiming} onChange={(event) => setCoachingTiming(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="quiet">Quiet hours</Label><Input id="quiet" placeholder="10:30 PM - 6 AM" value={quietHours} onChange={(event) => setQuietHours(event.target.value)} /></div></div><div className="rounded-2xl border border-dashed p-4 text-sm"><p className="font-semibold">Planner rule</p><p className="text-muted-foreground mt-1">Your available hours, preferred time and blocked windows are passed to the planner so generated sessions stay realistic.</p></div></div>}

          {step === 4 && <div className="space-y-5"><div><p className="text-sm font-semibold text-violet-500">05 · Ready</p><h2 className="mt-1 text-2xl font-bold">Your plan is one click away.</h2><p className="text-muted-foreground mt-1 text-sm">The planner will prioritize the subjects you selected and the student's existing weakness data already available to ilm AI.</p></div><div className="grid gap-3 sm:grid-cols-2"><Review label="Goal" value={goals.find((item) => item.id === goal)?.title || goal} /><Review label="Exam date" value={examDate || 'Flexible'} /><Review label="Daily capacity" value={`${dailyAvailableHours} hours`} /><Review label="Best time" value={studyTime} /><Review label="Subjects" value={`${focusSubjectIds.length} selected`} /><Review label="Blocked windows" value={[schoolTiming, coachingTiming, quietHours].filter(Boolean).length ? 'Configured' : 'None'} /></div><div className="rounded-2xl bg-violet-500/10 p-4"><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-violet-500" /> What happens next?</div><p className="text-muted-foreground mt-1 text-sm">ilm AI generates sessions across your available time, then you land directly in Today Planner with the next thing to do.</p></div></div>}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={step === 0 || pending} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft className="h-4 w-4" /> Back</Button>{step < 4 ? <Button type="button" variant="gradient" onClick={() => { if (step === 0 && goal === 'exam' && !examDate) { toast.error('Choose your exam date first.'); return; } if (step === 1 && focusSubjectIds.length === 0) { toast.error('Choose at least one subject.'); return; } setStep((value) => value + 1); }}>Continue <ChevronRight className="h-4 w-4" /></Button> : <Button type="button" variant="gradient" disabled={pending} onClick={submit}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Build my plan</Button>}</div>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-muted/15 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>; }
