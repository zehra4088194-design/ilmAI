'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search } from 'lucide-react';
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
import {
  completeProfile,
  completeParentProfile,
  completeUniversityProfile,
  requestSchoolJoin,
} from '@/app/onboarding/complete-profile/actions';
import { ThemePicker } from '@/components/common/ThemePicker';
import { cn } from '@/lib/utils/cn';
import type { ScienceGroup } from '@/types';

// Google sign-in never carries a role the way the email/password RegisterForm wizard's identity
// step does (Google only ever gives us email/name/avatar), so every brand-new Google account
// defaulted to role='student' and landed straight on the school/university fields below with no
// way to say "actually I'm a parent" or "I'm a teacher joining my school". This first choice
// mirrors RegisterForm's identity step for the two cases that matter for an ALREADY-authenticated
// account: parent (own lightweight flow, no education fields at all) and teacher joining an
// existing school (search + join request, same school_join_requests flow RegisterForm uses). A
// brand-new school's owner/principal is still created by a platform admin via /admin/schools, not
// self-service here.
type WhoAmI = 'student' | 'parent' | 'teacher';

function SchoolJoinStep({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/schools/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => setResults(data.schools || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  function handleSubmit() {
    if (!selected) {
      setError('Search for and select your school first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestSchoolJoin(selected.id, fullName);
      if (!result.success) {
        setError(result.error ?? 'Could not send the join request. Please try again.');
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Your full name</label>
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ahmad Khan" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Find your school</label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={selected ? selected.name : query}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
            }}
            placeholder="Search your school's name..."
            className="pl-9"
          />
        </div>
        {!selected && results.length > 0 && (
          <div className="border-border divide-border max-h-48 divide-y overflow-y-auto rounded-lg border">
            {results.map((school) => (
              <button
                key={school.id}
                type="button"
                onClick={() => {
                  setSelected(school);
                  setResults([]);
                }}
                className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
              >
                {school.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          A request goes to your school's admin — you get access once they approve it.
        </p>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button onClick={handleSubmit} disabled={!selected || !fullName.trim() || isPending} className="w-full">
        {isPending ? 'Sending request...' : 'Send join request'}
      </Button>
    </div>
  );
}

export function CompleteProfileStep({
  initialGender,
  skipWhoAmI = false,
  initialUsername = '',
  initialEducationLevel = 'school',
  initialBoard = '',
  initialGradeLevel = '',
}: {
  initialGender: 'girl' | 'boy' | null;
  // True for anyone who signed up via the email/password RegisterForm wizard (role was an
  // explicit choice there) — only a Google/OAuth sign-in (no role metadata at all) still needs to
  // pick "who are you" here. See complete-profile/page.tsx for the exact detection.
  skipWhoAmI?: boolean;
  initialUsername?: string;
  initialEducationLevel?: EducationLevel;
  initialBoard?: string;
  initialGradeLevel?: string;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [whoAmI, setWhoAmI] = useState<WhoAmI | null>(skipWhoAmI ? 'student' : null);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(initialEducationLevel);
  const [username, setUsername] = useState(initialUsername);
  const [gender, setGender] = useState<'girl' | 'boy' | null>(initialGender);
  const [board, setBoard] = useState(initialBoard);
  const [gradeLevel, setGradeLevel] = useState(initialGradeLevel);
  const [scienceGroup, setScienceGroup] = useState<ScienceGroup | null>(null);
  const [stream, setStream] = useState<UniversityStream>('engineering');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [courses, setCourses] = useState('');
  const [examTargetDate, setExamTargetDate] = useState('');
  const [preferredOutputStyle, setPreferredOutputStyle] = useState<PreferredOutputStyle>('simple');
  const [error, setError] = useState<string | null>(null);
  const [parentUsername, setParentUsername] = useState('');

  // The email/password RegisterForm wizard already collects username (CORE_STEPS) and gender
  // (GENDER_STEP) for student/university identities before ever routing here — this page only
  // exists to collect what that wizard couldn't (board/grade/science subject, or the
  // university program/semester fields). Re-showing already-answered fields was pure duplicate
  // work for that person, so we only render them when they're genuinely still missing (which is
  // exactly the Google/OAuth case, where neither was ever collected).
  const usernameAlreadyKnown = initialUsername.trim() !== '';
  const genderAlreadyKnown = initialGender !== null;

  const canSubmit =
    educationLevel === 'university'
      ? username.trim() !== '' && gender !== null && program.trim() !== '' && semester.trim() !== '' && !isPending
      : username.trim() !== '' &&
        gender !== null &&
        board !== '' &&
        gradeLevel !== '' &&
        scienceGroup !== null &&
        !isPending;

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
          : await completeProfile(board, gradeLevel, username, gender!, scienceGroup!);
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

  function handleParentSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await completeParentProfile(parentUsername);
      if (!result.success) {
        setError(result.error ?? 'Could not save your profile. Please try again.');
        return;
      }
      router.replace('/parent');
      router.refresh();
    });
  }

  if (whoAmI === null) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">One more step</h1>
          <p className="text-muted-foreground text-sm">First, tell us who you are.</p>
        </div>
        <div className="grid gap-2">
          {(
            [
              ['student', 'Student', 'Studying at a school, college, or university'],
              ['parent', 'Parent', 'Tracking a child’s progress on ilm AI'],
              ['teacher', 'Teacher', 'Joining my school as staff'],
            ] as const
          ).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => setWhoAmI(value)}
              className="border-border hover:border-primary/40 rounded-xl border px-4 py-3 text-left transition-colors"
            >
              <span className="block text-sm font-semibold">{label}</span>
              <span className="text-muted-foreground text-xs">{description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (whoAmI === 'parent') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Parent account</h1>
          <p className="text-muted-foreground text-sm">Pick a username, then connect your child from the parent dashboard.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Unique username</label>
            <Input
              value={parentUsername}
              onChange={(event) => setParentUsername(event.target.value.toLowerCase())}
              placeholder="e.g. ahmad.parent"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setWhoAmI(null)}>
              Back
            </Button>
            <Button onClick={handleParentSubmit} disabled={!parentUsername.trim() || isPending} className="flex-1">
              {isPending ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (whoAmI === 'teacher') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Join your school</h1>
          <p className="text-muted-foreground text-sm">
            Setting up a brand-new school? Contact ilm AI's admin team instead — this is for joining a school already on ilm AI.
          </p>
        </div>
        <SchoolJoinStep
          onDone={() => {
            router.replace('/dashboard');
            router.refresh();
          }}
        />
        <Button type="button" variant="outline" onClick={() => setWhoAmI(null)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">One more step</h1>
        <p className="text-muted-foreground text-sm">
          Confirm your education level and we will tailor the dashboard to your study goals.
        </p>
      </div>

      <div className="space-y-4">
        {!genderAlreadyKnown && (
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
            <p className="text-muted-foreground text-xs">
              Only students of the same gender can connect in Study Buddies.
            </p>
          </div>
        )}
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

        {!usernameAlreadyKnown && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Unique username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder="e.g. ahmad.study"
            />
            <p className="text-muted-foreground text-xs">
              3-30 characters: letters, numbers, dots, or underscores. Study Buddies uses this for search.
            </p>
          </div>
        )}

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
              <Input
                list="degree-suggestions"
                value={program}
                onChange={(event) => setProgram(event.target.value)}
                placeholder="Search or type your degree (e.g. BS Computer Science)"
              />
              <datalist id="degree-suggestions">
                {(UNIVERSITY_STREAMS.find((item) => item.value === stream)?.degrees || []).map((degree) => (
                  <option key={degree} value={degree} />
                ))}
              </datalist>
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
                  <SelectValue placeholder="Select your board" />
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
                  <SelectValue placeholder="Select your grade" />
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Science subject</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['biology', 'Biology'],
                    ['computer', 'Computer Science'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={scienceGroup === value}
                    onClick={() => setScienceGroup(value)}
                    className={cn(
                      'rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors',
                      scienceGroup === value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Saved once and used across books, quizzes, games, and study tools.
              </p>
            </div>
          </>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="border-border bg-card/80 space-y-3 rounded-2xl border p-4">
          <div>
            <h2 className="text-sm font-semibold">Choose your theme</h2>
            <p className="text-muted-foreground mt-1 text-xs">You can change this later in Settings.</p>
          </div>
          <ThemePicker compact />
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isPending ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
