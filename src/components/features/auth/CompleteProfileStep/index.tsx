'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import {
  EDUCATION_LEVELS,
  OUTPUT_STYLES,
  UNIVERSITY_STREAMS,
  type EducationLevel,
  type PreferredOutputStyle,
  type UniversityStream,
} from '@/lib/constants/university';
import { completeProfile, completeUniversityProfile } from '@/app/onboarding/complete-profile/actions';
import { ThemePicker } from '@/components/common/ThemePicker';
import { cn } from '@/lib/utils/cn';

export function CompleteProfileStep({ initialGender }: { initialGender: 'girl' | 'boy' | null }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'girl' | 'boy' | null>(initialGender);
  const [board, setBoard] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [stream, setStream] = useState<UniversityStream>('engineering');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [courses, setCourses] = useState('');
  const [examTargetDate, setExamTargetDate] = useState('');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>('simple');
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    educationLevel === 'university'
      ? username.trim() !== '' && gender !== null && program.trim() !== '' && semester.trim() !== '' && !isPending
      : username.trim() !== '' && gender !== null && board !== '' && gradeLevel !== '' && !isPending;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result =
        educationLevel === 'university'
          ? await completeUniversityProfile({
              username,
              stream,
              degree: program,
              program,
              semester,
              courses: courses.split(','),
              examTargetDate: examTargetDate || null,
              preferredOutputStyle,
              gender: gender!,
            })
          : await completeProfile(board, gradeLevel, username, gender!);
      if (!result.success) {
        setError(result.error ?? 'Could not save your profile. Please try again.');
        return;
      }
      if (!window.localStorage.getItem('ilm-ai-theme-explicit')) {
        setTheme(gender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark');
      }
      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Bas ek chhota sa step baaki hai</h1>
        <p className="text-muted-foreground text-sm">
          Apna education level confirm kar do, phir dashboard tumhare study goals ke mutabiq set ho jayega.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">You are</label>
          <div className="grid grid-cols-2 gap-2">
            {(['girl', 'boy'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={gender === value}
                onClick={() => setGender(value)}
                className={cn(
                  'rounded-xl border-2 px-4 py-3 text-sm font-semibold capitalize transition-all',
                  gender === value
                    ? value === 'girl'
                      ? 'border-pink-500 bg-pink-500/15 text-pink-500'
                      : 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                    : 'border-border text-muted-foreground'
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">Study Buddies mein sirf same-gender students connect kar sakte hain.</p>
        </div>
        <div className="grid gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              aria-pressed={educationLevel === level.value}
              data-selectable="true"
              onClick={() => setEducationLevel(level.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${educationLevel === level.value ? 'border-primary shadow-primary/15 shadow-sm' : 'border-border'}`}
            >
              <span className="block text-sm font-semibold">{level.label}</span>
              <span className="text-muted-foreground text-xs">{level.description}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Unique username</label>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            placeholder="e.g. ahmad.study"
          />
          <p className="text-muted-foreground text-xs">
            3-30 characters: letters, numbers, dot ya underscore. Isi se Study Buddies me search hoga.
          </p>
        </div>

        {educationLevel === 'university' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Section</label>
              <Select
                value={stream}
                onValueChange={(value) => {
                  setStream(value as UniversityStream);
                  setProgram('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITY_STREAMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Degree / Program</label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Apni degree select karo" />
                </SelectTrigger>
                <SelectContent>
                  {(UNIVERSITY_STREAMS.find((item) => item.value === stream)?.degrees || []).map((degree) => (
                    <SelectItem key={degree} value={degree}>
                      {degree}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Semester</label>
              <Input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="Semester 4" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subjects / Courses</label>
              <Input
                value={courses}
                onChange={(event) => setCourses(event.target.value)}
                placeholder="Data Structures, DBMS, Calculus"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Exam target</label>
                <Input type="date" value={examTargetDate} onChange={(event) => setExamTargetDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Output style</label>
                <Select
                  value={preferredOutputStyle}
                  onValueChange={(value) => setPreferredOutputStyle(value as PreferredOutputStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
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

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="border-border bg-card/80 space-y-3 rounded-2xl border p-4">
          <div>
            <h2 className="text-sm font-semibold">Apni theme choose karo</h2>
            <p className="text-muted-foreground mt-1 text-xs">Ye baad mein Settings se change ho sakti hai.</p>
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
