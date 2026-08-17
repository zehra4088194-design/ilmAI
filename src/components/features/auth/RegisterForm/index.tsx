'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Building2,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Languages,
  Mail,
  Presentation,
  School,
  Search,
  ShieldCheck,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { BOARDS, COUNTRY_BOARD_DEFAULTS, GRADE_LEVELS } from '@/lib/constants';
import { EDUCATION_LEVELS, type EducationLevel } from '@/lib/constants/university';
import { PAKISTAN_SCHOOLS, PAKISTAN_COLLEGES, PAKISTAN_UNIVERSITIES, suggestInstitutions } from '@/lib/constants/institutions';
import { calculateAge, KIDS_DASHBOARD_AGE_CUTOFF } from '@/lib/kids/eligibility';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useLocale, useTranslations } from '@/providers/I18nProvider';
import { THEME_COOKIE_NAME } from '@/lib/constants/themes';
import type { Locale } from '@/lib/i18n/config';
import { verifyAuthRecaptcha } from '@/lib/security/recaptcha-client';

const formSchema = z.object({
  fullName: z.string().trim().min(2, 'Min 2 characters'),
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
  username: z
    .string()
    .trim()
    .min(3, 'Min 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-z0-9._]+$/i, 'Letters, numbers, dot and underscore only'),
  institutionName: z.string().trim().optional(),
  gradeLevel: z.string().optional(),
  board: z.string().optional(),
  birthDate: z.string().optional(),
});

const schema = formSchema.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type AccountType = 'student' | 'parent';
type MembershipMode = 'individual' | 'institutional';
type InstitutionalRole = 'student' | 'teacher';
type Gender = 'girl' | 'boy';
type SignupStepId =
  | 'mode'
  | 'account'
  | 'role'
  | 'language'
  | 'name'
  | 'email'
  | 'password'
  | 'username'
  | 'birthdate'
  | 'gender'
  | 'education'
  | 'institution'
  | 'school'
  | 'grade'
  | 'board';

type SignupStep = {
  id: SignupStepId;
  title: string;
  description: string;
};

const MODE_STEP: SignupStep = {
  id: 'mode',
  title: 'How will you use ilm AI?',
  description: 'A personal account, or one linked to your school/college on ilm AI?',
};

const ACCOUNT_STEP: SignupStep = {
  id: 'account',
  title: 'Student or parent?',
  description: 'Choose your account type once to personalise signup.',
};

const ROLE_STEP: SignupStep = {
  id: 'role',
  title: 'Student or teacher?',
  description: 'Choose your role at the institution.',
};

// Asked right at the start (before name/email) for individual student signups
// so the rest of the wizard — and the whole app afterwards — can adapt
// immediately for a young child, rather than discovering it later. Age drives
// the Kids Dashboard eligibility check (src/lib/kids/eligibility.ts) directly
// from date_of_birth, so this single question also replaces the class/grade
// question for anyone too young to pick from the normal grade list.
const BIRTHDATE_STEP: SignupStep = {
  id: 'birthdate',
  title: "When's your birthday?",
  description: 'This helps us set up the right experience for your age.',
};

const CORE_STEPS: SignupStep[] = [
  { id: 'language', title: 'Choose your language', description: 'Choose English or Roman Urdu for the interface.' },
  { id: 'name', title: 'Your name', description: 'Enter the name that will appear in the app.' },
  { id: 'email', title: 'Email address', description: 'Used for login and account recovery.' },
  {
    id: 'password',
    title: 'Secure password',
    description: 'You can also use the strong password suggested by your browser.',
  },
  {
    id: 'username',
    title: 'Unique username',
    description: 'People can find you by this @username in search and Study Buddies.',
  },
];

const GENDER_STEP: SignupStep = {
  id: 'gender',
  title: 'Gender',
  description: 'Used for Study Buddies privacy and your default theme.',
};

const STUDENT_STEPS: SignupStep[] = [
  GENDER_STEP,
  {
    id: 'education',
    title: 'Where do you study?',
    description: 'Select your school, college, or university level.',
  },
  {
    id: 'institution',
    title: 'Institution name',
    description: 'Enter the name of your school, college, or university.',
  },
];

const SCHOOL_STEPS: SignupStep[] = [
  { id: 'grade', title: 'Your class', description: 'Lectures, notes, and papers for this class will be shown.' },
  {
    id: 'board',
    title: 'Your board',
    description: 'The final step. Board-specific content will be filtered using this choice.',
  },
];

const SCHOOL_SEARCH_STEP: SignupStep = {
  id: 'school',
  title: 'Find your institution',
  description: 'Search for your school on ilm AI. Its admin approves your request before you get access.',
};

// `institutional` skips the free `institution`/`education` text fields in
// favour of SCHOOL_SEARCH_STEP, which looks up a real school_organizations
// row and (post-signup) files a school_join_requests approval request
// instead of just storing a label on the profile — see
// src/lib/school-erp/join-requests.ts.
export function getSignupSteps(
  membershipMode: MembershipMode,
  accountType: AccountType,
  institutionalRole: InstitutionalRole,
  educationLevel: EducationLevel,
  isYoungChild: boolean = false
) {
  if (membershipMode === 'institutional') {
    if (institutionalRole === 'teacher') {
      return [MODE_STEP, ROLE_STEP, ...CORE_STEPS, SCHOOL_SEARCH_STEP];
    }
    return [MODE_STEP, ROLE_STEP, ...CORE_STEPS, GENDER_STEP, SCHOOL_SEARCH_STEP, ...SCHOOL_STEPS];
  }
  if (accountType === 'parent') return [MODE_STEP, ACCOUNT_STEP, ...CORE_STEPS];
  // Young child (under 8, per BIRTHDATE_STEP): skip gender/education/institution/
  // grade/board entirely — none of it is needed (the Kids Dashboard doesn't
  // personalize by any of that) and grade options only start at Grade 9 anyway.
  if (isYoungChild) return [MODE_STEP, ACCOUNT_STEP, BIRTHDATE_STEP, ...CORE_STEPS];
  return [
    MODE_STEP,
    ACCOUNT_STEP,
    BIRTHDATE_STEP,
    ...CORE_STEPS,
    ...STUDENT_STEPS,
    ...(educationLevel === 'university' ? [] : SCHOOL_STEPS),
  ];
}

type SchoolSearchResult = { id: string; name: string; organization_type: string };

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [membershipMode, setMembershipMode] = useState<MembershipMode>('individual');
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [institutionalRole, setInstitutionalRole] = useState<InstitutionalRole>('student');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [gender, setGender] = useState<Gender | null>(null);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchResult[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [institutionSuggestionsOpen, setInstitutionSuggestionsOpen] = useState(false);
  const { locale, setLocale } = useLocale();
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(locale);
  const [stepIndex, setStepIndex] = useState(0);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  // The account's identity (drives profiles.role): institutional signup
  // asks for it directly via the role step; individual signup keeps the
  // existing student/parent choice.
  const effectiveRole: InstitutionalRole | 'parent' = membershipMode === 'institutional' ? institutionalRole : accountType;

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    setFocus,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      institutionName: '',
      gradeLevel: '',
      board: '',
      birthDate: '',
    },
  });
  const selectedGrade = watch('gradeLevel');
  const institutionNameValue = watch('institutionName') || '';
  const institutionSuggestionList =
    educationLevel === 'university' ? PAKISTAN_UNIVERSITIES : educationLevel === 'college' ? PAKISTAN_COLLEGES : PAKISTAN_SCHOOLS;
  const institutionSuggestions = institutionSuggestionsOpen
    ? suggestInstitutions(institutionSuggestionList, institutionNameValue)
    : [];
  const birthDateValue = watch('birthDate');
  const isYoungChild =
    membershipMode === 'individual' && accountType === 'student' && calculateAge(birthDateValue) !== null && (calculateAge(birthDateValue) as number) < KIDS_DASHBOARD_AGE_CUTOFF;

  const steps = useMemo(
    () => getSignupSteps(membershipMode, accountType, institutionalRole, educationLevel, isYoungChild),
    [membershipMode, accountType, institutionalRole, educationLevel, isYoungChild]
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    fetch('/api/geo')
      .then((response) => response.json())
      .then((json) => {
        const country = json?.country as string | undefined;
        if (country && COUNTRY_BOARD_DEFAULTS[country]) {
          setDetectedCountry(country);
          setValue('board', COUNTRY_BOARD_DEFAULTS[country]);
        }
      })
      .catch(() => {});
  }, [setValue]);

  useEffect(() => {
    const fieldByStep: Partial<Record<SignupStepId, keyof FormData>> = {
      name: 'fullName',
      email: 'email',
      password: 'password',
      username: 'username',
      institution: 'institutionName',
      grade: 'gradeLevel',
      board: 'board',
      birthdate: 'birthDate',
    };
    const field = fieldByStep[currentStep.id];
    if (!field) return;
    const timer = window.setTimeout(() => setFocus(field), 80);
    return () => window.clearTimeout(timer);
  }, [currentStep.id, setFocus]);

  useEffect(() => {
    if (currentStep.id !== 'school') return;
    const term = schoolQuery.trim();
    if (term.length < 2) {
      setSchoolResults([]);
      setSearchingSchools(false);
      return;
    }
    setSearchingSchools(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/schools/search?q=${encodeURIComponent(term)}`)
        .then((response) => response.json())
        .then((json) => setSchoolResults(json.schools || []))
        .catch(() => setSchoolResults([]))
        .finally(() => setSearchingSchools(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [schoolQuery, currentStep.id]);

  const checkUsername = async () => {
    const username = getValues('username').trim().toLowerCase();
    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const json = await response.json().catch(() => ({ available: false }));
      if (!response.ok || json.available !== true) {
        toast.error(json.error || 'This username is already taken.');
        return false;
      }
      setValue('username', username, { shouldValidate: true });
      return true;
    } catch {
      toast.error('We could not check the username. Please try again.');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const validateCurrentStep = async () => {
    const validateField = <Field extends keyof typeof formSchema.shape>(field: Field) => {
      const result = formSchema.shape[field].safeParse(getValues(field));
      if (!result.success) {
        setError(field, { type: 'manual', message: result.error.issues[0]?.message || 'Invalid value' });
        return false;
      }
      clearErrors(field);
      return true;
    };

    switch (currentStep.id) {
      case 'name':
        return validateField('fullName');
      case 'email':
        return validateField('email');
      case 'password': {
        if (!validateField('password')) return false;
        if (getValues('password') !== getValues('confirmPassword')) {
          setError('confirmPassword', { type: 'manual', message: 'Passwords do not match' });
          return false;
        }
        clearErrors('confirmPassword');
        return true;
      }
      case 'username': {
        if (!validateField('username')) return false;
        return checkUsername();
      }
      case 'birthdate':
        if (!getValues('birthDate')) {
          toast.error('Please select a date of birth.');
          return false;
        }
        return true;
      case 'gender':
        if (!gender) {
          toast.error('Please select your gender.');
          return false;
        }
        return true;
      case 'institution':
        if ((getValues('institutionName') || '').trim().length < 2) {
          toast.error('Enter a valid institution name.');
          return false;
        }
        return true;
      case 'school':
        if (!selectedSchool) {
          toast.error('Search and select your institution first.');
          return false;
        }
        return true;
      case 'grade':
        if (!getValues('gradeLevel')) {
          toast.error('Please select your class.');
          return false;
        }
        return true;
      case 'board':
        if (!getValues('board')) {
          toast.error('Please select your board.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = async () => {
    if (!(await validateCurrentStep())) return;
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const changeAccountType = (nextType: AccountType) => {
    setAccountType(nextType);
    if (nextType === 'parent') setGender(null);
  };

  const changeMembershipMode = (mode: MembershipMode) => {
    setMembershipMode(mode);
    setSelectedSchool(null);
    setSchoolQuery('');
    setSchoolResults([]);
  };

  const onSubmit = async (data: FormData) => {
    const isInstitutional = membershipMode === 'institutional';

    if (effectiveRole === 'student' && !isYoungChild) {
      if (!gender) {
        toast.error('Please select your gender.');
        return;
      }
      if (isInstitutional) {
        if (!selectedSchool) {
          toast.error('Search and select your institution first.');
          return;
        }
      } else if (!data.institutionName?.trim()) {
        toast.error('Enter your institution name.');
        return;
      }
      if (educationLevel !== 'university' && (!data.gradeLevel || !data.board)) {
        toast.error('Select your class and board.');
        return;
      }
    }

    if (effectiveRole === 'teacher' && !selectedSchool) {
      toast.error('Search and select your institution first.');
      return;
    }

    if (!(await checkUsername())) return;

    try {
      await verifyAuthRecaptcha('auth_signup');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Security verification failed. Please try again.');
      return;
    }

    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          username: data.username.trim().toLowerCase(),
          role: effectiveRole,
          board: effectiveRole === 'student' && educationLevel !== 'university' ? data.board : undefined,
          grade_level: effectiveRole === 'student' && educationLevel !== 'university' ? data.gradeLevel : undefined,
          education_level: effectiveRole === 'student' ? educationLevel : undefined,
          academic_institution_name:
            effectiveRole === 'student' && !isInstitutional ? data.institutionName?.trim() || undefined : undefined,
          academic_institution_type: effectiveRole === 'student' && !isInstitutional ? educationLevel : undefined,
          gender: effectiveRole === 'student' ? gender : undefined,
          date_of_birth: effectiveRole === 'student' && !isInstitutional ? data.birthDate || undefined : undefined,
          preferred_language: preferredLanguage,
          signup_institution_id: isInstitutional ? selectedSchool?.id : undefined,
          signup_role_requested: isInstitutional ? institutionalRole : undefined,
        },
        emailRedirectTo: callbackUrl.toString(),
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    if (signUpData.session) {
      const profileResponse = await fetch('/api/auth/ensure-profile', { method: 'POST' });
      if (!profileResponse.ok) {
        toast.error('Profile setup failed. Please log in again and try.');
        return;
      }
      toast.success(
        isInstitutional && selectedSchool
          ? `Account created. Your request to join ${selectedSchool.name} has been sent for approval.`
          : 'Account created successfully.'
      );
      if (effectiveRole === 'student' && gender) {
        const genderTheme = gender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark';
        window.localStorage.setItem('theme', genderTheme);
        document.cookie = `${THEME_COOKIE_NAME}=${genderTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.localStorage.setItem('ilm-ai-gender-theme-user', signUpData.user?.id || data.email);
      }
      router.push(
        effectiveRole === 'parent'
          ? '/parent'
          : isYoungChild
            ? '/kids'
            : !isInstitutional && educationLevel === 'university'
              ? '/onboarding/complete-profile'
              : redirect
      );
      router.refresh();
      return;
    }

    toast.success('Account created. Check your email.');
    window.sessionStorage.setItem('ilm-ai-pending-verification-email', data.email.trim().toLowerCase());
    router.push('/verify-email');
  };

  const availableGrades = GRADE_LEVELS.filter((grade) => {
    if (educationLevel === 'school') return ['GRADE_9', 'GRADE_10', 'O_LEVEL'].includes(grade.value);
    return ['GRADE_11', 'GRADE_12', 'A_LEVEL'].includes(grade.value);
  });

  return (
    <div className={cn(isYoungChild && 'rounded-3xl bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50 p-4 dark:from-sky-950/40 dark:via-violet-950/40 dark:to-amber-950/40')}>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h1 className={cn('text-2xl font-bold', isYoungChild && 'text-violet-700 dark:text-violet-200')}>
              {isYoungChild ? '🎈 ' : ''}
              {t('auth.register.title')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{currentStep.description}</p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
              isYoungChild ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-primary/10 text-primary'
            )}
          >
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
        <div className="flex gap-1.5" aria-label={`Signup step ${stepIndex + 1} of ${steps.length}`}>
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index <= stepIndex ? (isYoungChild ? 'bg-violet-500' : 'bg-primary') : 'bg-muted'
              )}
            />
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-[11px] leading-4">
          Privacy: recent chats stay live for 2 days, then move to secure archive storage. Temporary scans are deleted
          after 2 days.
        </p>
      </div>

      {currentStep.id === 'name' && membershipMode === 'individual' && (
        <>
          <OAuthButtons action="Register" role={accountType} />
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">{t('auth.register.orEmail')}</span>
            </div>
          </div>
        </>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) void handleSubmit(onSubmit)();
          else void goNext();
        }}
        className="space-y-5"
      >
        <div className="min-h-36">
          <h2 className="mb-4 text-xl font-bold">{currentStep.title}</h2>

          {currentStep.id === 'mode' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changeMembershipMode('individual')}
                aria-pressed={membershipMode === 'individual'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  membershipMode === 'individual'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <User className="h-6 w-6" /> Individual
                <span className="text-muted-foreground text-xs font-normal">Personal account, learn at your own pace</span>
              </button>
              <button
                type="button"
                onClick={() => changeMembershipMode('institutional')}
                aria-pressed={membershipMode === 'institutional'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  membershipMode === 'institutional'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <Building2 className="h-6 w-6" /> Institutional
                <span className="text-muted-foreground text-xs font-normal">
                  Join your school or college as a student or teacher
                </span>
              </button>
            </div>
          )}

          {currentStep.id === 'role' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setInstitutionalRole('student')}
                aria-pressed={institutionalRole === 'student'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  institutionalRole === 'student'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <GraduationCap className="h-6 w-6" /> Student
                <span className="text-muted-foreground text-xs font-normal">Attend classes, view results and fees</span>
              </button>
              <button
                type="button"
                onClick={() => setInstitutionalRole('teacher')}
                aria-pressed={institutionalRole === 'teacher'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  institutionalRole === 'teacher'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <Presentation className="h-6 w-6" /> Teacher
                <span className="text-muted-foreground text-xs font-normal">Manage classes, attendance and exams</span>
              </button>
            </div>
          )}

          {currentStep.id === 'account' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changeAccountType('student')}
                aria-pressed={accountType === 'student'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  accountType === 'student'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <GraduationCap className="h-6 w-6" /> {t('auth.register.student')}
                <span className="text-muted-foreground text-xs font-normal">Classes, board and practice setup</span>
              </button>
              <button
                type="button"
                onClick={() => changeAccountType('parent')}
                aria-pressed={accountType === 'parent'}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-semibold transition-all',
                  accountType === 'parent'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
                )}
              >
                <Users className="h-6 w-6" /> {t('auth.register.parent')}
                <span className="text-muted-foreground text-xs font-normal">Link and support your student</span>
              </button>
            </div>
          )}

          {currentStep.id === 'language' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: 'en' as const, label: 'English', description: 'Load the interface in English.' },
                {
                  value: 'roman-ur' as const,
                  label: 'Roman Urdu',
                  description: 'Read Urdu using English letters.',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={preferredLanguage === option.value}
                  onClick={() => {
                    setPreferredLanguage(option.value);
                    setLocale(option.value);
                  }}
                  className={cn(
                    'relative rounded-2xl border-2 p-5 text-left transition-all',
                    preferredLanguage === option.value
                      ? 'border-primary bg-primary/15 shadow-primary/15 shadow-lg'
                      : 'border-border bg-card/70 hover:border-primary/40'
                  )}
                >
                  <Languages className="text-primary mb-4 h-6 w-6" />
                  <span className="block font-bold">{option.label}</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">{option.description}</span>
                  {preferredLanguage === option.value && (
                    <Check className="text-primary absolute top-4 right-4 h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          )}

          {currentStep.id === 'name' && (
            <div>
              <label htmlFor="signup-full-name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <div className="relative">
                <User className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Input
                  {...register('fullName')}
                  id="signup-full-name"
                  autoComplete="name"
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  className="pl-10"
                  error={errors.fullName?.message}
                />
              </div>
            </div>
          )}

          {currentStep.id === 'email' && (
            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Input
                  {...register('email')}
                  id="signup-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={t('auth.register.emailPlaceholder')}
                  className="pl-10"
                  error={errors.email?.message}
                />
              </div>
            </div>
          )}

          {currentStep.id === 'password' && (
            <div className="space-y-4">
              <input
                type="email"
                name="signup-email-for-password-manager"
                value={getValues('email')}
                autoComplete="username"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-medium">
                  New password
                </label>
                <div className="relative">
                  <Lock className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                  <Input
                    {...register('password')}
                    id="signup-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    className="pr-10 pl-10"
                    error={errors.password?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((current) => !current)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="text-muted-foreground hover:text-foreground absolute top-5 right-3 z-10 -translate-y-1/2"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-medium">
                  Confirm password
                </label>
                <Input
                  {...register('confirmPassword')}
                  id="signup-confirm-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                  error={errors.confirmPassword?.message}
                />
              </div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <ShieldCheck className="text-primary h-4 w-4" /> Chrome password suggestions are supported.
              </p>
            </div>
          )}

          {currentStep.id === 'username' && (
            <div>
              <label htmlFor="signup-username" className="mb-2 block text-sm font-medium">
                Username
              </label>
              <div className="relative">
                <AtSign className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Input
                  {...register('username')}
                  id="signup-username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="your.name"
                  className="pl-10"
                  error={errors.username?.message}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Use letters, numbers, dots, and underscores. Every username must be unique.
              </p>
            </div>
          )}

          {currentStep.id === 'birthdate' && (
            <div>
              <label htmlFor="signup-birthdate" className="mb-2 block text-sm font-medium">
                Date of birth
              </label>
              <Input
                {...register('birthDate')}
                id="signup-birthdate"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                error={errors.birthDate?.message}
              />
              {isYoungChild && (
                <div className="border-primary bg-primary/10 mt-3 flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold">
                  <span className="text-2xl">🎈</span>
                  <span>
                    Yay! We&apos;ll set up a special, fun dashboard just for you — no boring grades or boards to pick.
                  </span>
                </div>
              )}
            </div>
          )}

          {currentStep.id === 'gender' && (
            <div className="grid grid-cols-2 gap-3">
              {(['girl', 'boy'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={gender === value}
                  onClick={() => setGender(value)}
                  className={cn(
                    'relative rounded-2xl border-2 px-4 py-6 text-center font-bold capitalize transition-all',
                    gender === value
                      ? value === 'girl'
                        ? 'border-pink-500 bg-pink-500/15 text-pink-500 shadow-lg shadow-pink-500/10'
                        : 'border-emerald-500 bg-emerald-500/15 text-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {gender === value && <Check className="absolute top-3 right-3 h-4 w-4" />}
                  {value}
                </button>
              ))}
            </div>
          )}

          {currentStep.id === 'education' && (
            <div className="grid gap-3">
              {EDUCATION_LEVELS.map((level) => {
                const Icon = level.value === 'school' ? School : level.value === 'college' ? Building2 : GraduationCap;
                return (
                  <button
                    key={level.value}
                    type="button"
                    aria-pressed={educationLevel === level.value}
                    onClick={() => {
                      setEducationLevel(level.value);
                      setValue('gradeLevel', '');
                      setValue('board', detectedCountry ? COUNTRY_BOARD_DEFAULTS[detectedCountry] || '' : '');
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                      educationLevel === level.value
                        ? 'border-primary bg-primary/15 shadow-primary/15 shadow-sm'
                        : 'border-border bg-card/70 hover:border-primary/40'
                    )}
                  >
                    <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{level.label}</span>
                      <span className="text-muted-foreground text-xs">{level.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.id === 'institution' && (
            <div>
              <label htmlFor="signup-institution" className="mb-2 block text-sm font-medium">
                {educationLevel === 'university'
                  ? 'University name'
                  : educationLevel === 'college'
                    ? 'College name'
                    : 'School name'}
              </label>
              <div className="relative">
                <Building2 className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Input
                  {...register('institutionName')}
                  id="signup-institution"
                  autoComplete="off"
                  placeholder={`Enter your ${educationLevel} name`}
                  className="pl-10"
                  error={errors.institutionName?.message}
                  onFocus={() => setInstitutionSuggestionsOpen(true)}
                  onChange={(event) => {
                    register('institutionName').onChange(event);
                    setInstitutionSuggestionsOpen(true);
                  }}
                  onBlur={(event) => {
                    register('institutionName').onBlur(event);
                    // Delay so a suggestion click (which blurs the input first) still
                    // registers before the list unmounts.
                    window.setTimeout(() => setInstitutionSuggestionsOpen(false), 150);
                  }}
                />
              </div>
              {institutionSuggestions.length > 0 && (
                <div className="border-border bg-card/70 mt-2 max-h-56 divide-y overflow-y-auto rounded-xl border">
                  {institutionSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setValue('institutionName', name, { shouldValidate: true });
                        setInstitutionSuggestionsOpen(false);
                      }}
                      className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                    >
                      <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="truncate">{name}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                Not listed? Just type your {educationLevel}'s name — any name is accepted.
              </p>
            </div>
          )}

          {currentStep.id === 'school' && (
            <div>
              <label htmlFor="signup-school-search" className="mb-2 block text-sm font-medium">
                Institution name
              </label>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="signup-school-search"
                  value={schoolQuery}
                  onChange={(event) => {
                    setSchoolQuery(event.target.value);
                    setSelectedSchool(null);
                  }}
                  autoComplete="off"
                  placeholder="Start typing your institution's name"
                  className="pl-10"
                />
              </div>
              {selectedSchool ? (
                <div className="border-primary bg-primary/10 text-primary mt-3 flex items-center justify-between gap-2 rounded-xl border-2 p-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> {selectedSchool.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSchool(null)}
                    className="text-xs font-normal underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  {searchingSchools && <p className="text-muted-foreground mt-2 text-xs">Searching…</p>}
                  {!searchingSchools && schoolQuery.trim().length > 1 && schoolResults.length > 0 && (
                    <div className="border-border bg-card/70 mt-2 max-h-56 divide-y overflow-y-auto rounded-xl border">
                      {schoolResults.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => {
                            setSelectedSchool({ id: school.id, name: school.name });
                            setSchoolQuery(school.name);
                          }}
                          className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                        >
                          <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{school.name}</span>
                            <span className="text-muted-foreground text-xs capitalize">{school.organization_type}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searchingSchools && schoolQuery.trim().length > 1 && schoolResults.length === 0 && (
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      No institution found by that name. Ask your school to set up its account at{' '}
                      <Link href="/schools/start" className="text-primary underline">
                        ilmai.study/schools/start
                      </Link>
                      , then search again.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {currentStep.id === 'grade' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableGrades.map((grade) => (
                <button
                  key={grade.value}
                  type="button"
                  aria-pressed={selectedGrade === grade.value}
                  onClick={() => setValue('gradeLevel', grade.value, { shouldValidate: true })}
                  className={cn(
                    'rounded-xl border-2 px-4 py-3 text-left transition-all',
                    selectedGrade === grade.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-card/70 hover:border-primary/40'
                  )}
                >
                  <span className="block text-sm font-bold">{grade.label}</span>
                  <span className="text-muted-foreground text-xs">{grade.level}</span>
                </button>
              ))}
            </div>
          )}

          {currentStep.id === 'board' && (
            <div>
              <label htmlFor="signup-board" className="mb-2 block text-sm font-medium">
                Board
              </label>
              <select
                {...register('board')}
                id="signup-board"
                className="border-input bg-background focus:ring-ring h-11 w-full rounded-xl border px-3 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="" disabled>
                  {t('auth.register.boardPlaceholder')}
                </option>
                {BOARDS.map((board) => (
                  <option key={board.value} value={board.value}>
                    {board.label}
                  </option>
                ))}
              </select>
              {detectedCountry && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {detectedCountry === 'IN'
                    ? 'India detected; CBSE was selected by default.'
                    : 'Pakistan detected; FBISE was selected by default.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isSubmitting || checkingUsername}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button
            type={isLastStep ? 'submit' : 'button'}
            variant="gradient"
            className="flex-1"
            size="lg"
            loading={isSubmitting || checkingUsername}
            onClick={isLastStep ? undefined : () => void goNext()}
          >
            {isLastStep ? (
              <>
                <Zap className="h-4 w-4" />
                {effectiveRole === 'parent'
                  ? t('auth.register.submitParent')
                  : effectiveRole === 'teacher'
                    ? 'Create teacher account'
                    : t('auth.register.submitStudent')}
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t('auth.register.haveAccount')}{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="text-primary font-medium hover:underline"
        >
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </div>
  );
}
