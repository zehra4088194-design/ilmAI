'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { EDUCATION_LEVELS, OUTPUT_STYLES, type EducationLevel, type PreferredOutputStyle } from '@/lib/constants/university';
import { completeProfile, completeUniversityProfile } from '@/app/onboarding/complete-profile/actions';
import { ThemePicker } from '@/components/common/ThemePicker';

export function CompleteProfileStep() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [board, setBoard] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [courses, setCourses] = useState('');
  const [examTargetDate, setExamTargetDate] = useState('');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>('simple');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = educationLevel === 'university'
    ? program.trim() !== '' && semester.trim() !== '' && !isPending
    : board !== '' && gradeLevel !== '' && !isPending;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = educationLevel === 'university'
        ? await completeUniversityProfile({
            program,
            semester,
            courses: courses.split(','),
            examTargetDate: examTargetDate || null,
            preferredOutputStyle,
          })
        : await completeProfile(board, gradeLevel);
      if (!result.success) {
        setError(result.error ?? 'Could not save your profile. Please try again.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Bas ek chhota sa step baaki hai
        </h1>
        <p className="text-sm text-muted-foreground">
          Apna education level confirm kar do, phir dashboard tumhare study goals
          ke mutabiq set ho jayega.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setEducationLevel(level.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${educationLevel === level.value ? 'border-primary bg-primary/20 shadow-sm shadow-primary/15' : 'border-border bg-card/80 hover:border-primary/40 hover:bg-primary/10'}`}
            >
              <span className="block text-sm font-semibold">{level.label}</span>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </button>
          ))}
        </div>

        {educationLevel === 'university' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Degree / Program</label>
              <Input value={program} onChange={(event) => setProgram(event.target.value)} placeholder="BS Computer Science" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Semester</label>
              <Input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="Semester 4" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subjects / Courses</label>
              <Input value={courses} onChange={(event) => setCourses(event.target.value)} placeholder="Data Structures, DBMS, Calculus" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Exam target</label>
                <Input type="date" value={examTargetDate} onChange={(event) => setExamTargetDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Output style</label>
                <Select value={preferredOutputStyle} onValueChange={(value) => setPreferredOutputStyle(value as PreferredOutputStyle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTPUT_STYLES.map((style) => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3 rounded-2xl border border-border bg-card/80 p-4">
          <div>
            <h2 className="text-sm font-semibold">Apni theme choose karo</h2>
            <p className="mt-1 text-xs text-muted-foreground">Ye baad mein Settings se change ho sakti hai.</p>
          </div>
          <ThemePicker compact />
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isPending ? 'Save ho raha hai...' : 'Aage badho'}
        </Button>
      </div>
    </div>
  );
}
