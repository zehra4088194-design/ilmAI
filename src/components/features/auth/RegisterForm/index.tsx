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
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { GRADE_LEVELS } from '@/lib/constants';
import { calculateAge, KIDS_DASHBOARD_AGE_CUTOFF } from '@/lib/kids/eligibility';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useLocale, useTranslations } from '@/providers/I18nProvider';
import type { Locale } from '@/lib/i18n/config';
import { verifyAuthRecaptcha } from '@/lib/security/recaptcha-client';

const formSchema = z.object({
  fullName: z.string().trim().min(2, 'Min 2 characters'),
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
  gradeLevel: z.string().optional(),
  birthDate: z.string().optional(),
});

const schema = formSchema.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type InstitutionalRole = 'student' | 'teacher' | 'principal';
type SignupIdentity = 'parent' | 'university' | 'school-college' | 'institutional' | 'kid';
type SignupStepId = 'identity' | 'role' | 'account' | 'study' | 'school';

type SignupStep = {
  id: SignupStepId;
  title: string;
  description: string;
};

const IDENTITY_STEP: SignupStep = {
  id: 'identity',
  title: 'Who are you?',
  description: 'Choose the kind of account you need.',
};

const ROLE_STEP: SignupStep = {
  id: 'role',
  title: 'What is your role?',
  description: 'Choose your role at your school or college.',
};

const ACCOUNT_STEP: SignupStep = {
  id: 'account',
  title: 'Create your account',
  description: 'Just the essentials. You can complete the rest later in Settings.',
};

const STUDY_STEP: SignupStep = {
  id: 'study',
  title: 'Set up your studies',
  description: 'We only need the information required to show the right learning content.',
};

const SCHOOL_SEARCH_STEP: SignupStep = {
  id: 'school',
  title: 'Find your institution',
  description: 'Search for your school on ilm AI. Its admin approves your request before you get access.',
};

function educationLevelFromGrade(gradeLevel: string | undefined): 'school' | 'college' {
  return gradeLevel === 'GRADE_11' || gradeLevel === 'GRADE_12' || gradeLevel === 'A_LEVEL' ? 'college' : 'school';
}

// Keep each persona on its own path. University is only selected when the user explicitly chose
// the University Student identity; a School/College Student never sees a university choice.
export function getSignupSteps(
  identity: SignupIdentity,
  institutionalRole?: InstitutionalRole
): SignupStep[] {
  if (identity === 'parent') return [IDENTITY_STEP, ACCOUNT_STEP];
  if (identity === 'kid') return [IDENTITY_STEP, ACCOUNT_STEP];
  if (identity === 'university') return [IDENTITY_STEP, ACCOUNT_STEP, STUDY_STEP];
  if (identity === 'school-college') return [IDENTITY_STEP, ACCOUNT_STEP, STUDY_STEP];

  if (identity === 'institutional') {
    if (institutionalRole === 'teacher' || institutionalRole === 'principal') {
      return [IDENTITY_STEP, ROLE_STEP, ACCOUNT_STEP, SCHOOL_SEARCH_STEP];
    }
    return [IDENTITY_STEP, ROLE_STEP, ACCOUNT_STEP, SCHOOL_SEARCH_STEP, STUDY_STEP];
  }

  return [IDENTITY_STEP, ACCOUNT_STEP];
}

type SchoolSearchResult = { id: string; name: string; organization_type: string };

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [identity, setIdentity] = useState<SignupIdentity | null>(null);
  const [institutionalRole, setInstitutionalRole] = useState<InstitutionalRole>('student');
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>('en');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchResult[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [universityProgram, setUniversityProgram] = useState('');
  const [universitySemester, setUniversitySemester] = useState('');

  const { setLocale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();

  const effectiveRole: InstitutionalRole | 'parent' =
    identity === 'parent'
      ? 'parent'
      : identity === 'institutional'
        ? institutionalRole
        : 'student';

  const {
    register,
    handleSubmit,
    getValues,
    setFocus,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      gradeLevel: '',
      birthDate: '',
    },
  });

  const selectedGrade = watch('gradeLevel');
  const birthDateValue = watch('birthDate');
  const isYoungChild = Boolean(
    identity === 'kid' &&
      typeof birthDateValue === 'string' &&
      birthDateValue &&
      calculateAge(birthDateValue) !== null &&
      (calculateAge(birthDateValue) as number) < KIDS_DASHBOARD_AGE_CUTOFF
  );

  const steps = useMemo(
    () => (identity ? getSignupSteps(identity, institutionalRole) : [IDENTITY_STEP]),
    [identity, institutionalRole]
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    const fieldByStep: Partial<Record<SignupStepId, keyof FormData>> = {
      study: 'gradeLevel',
    };
    const field = fieldByStep[currentStep.id];
    if (!field) {
      if (currentStep.id !== 'account') return;
      const timer = window.setTimeout(() => setFocus('fullName'), 80);
      return () => window.clearTimeout(timer);
    }
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
    }, 300);

    return () => window.clearTimeout(timer);
  }, [schoolQuery, currentStep.id]);

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
      case 'identity':
        if (!identity) {
          toast.error('Please choose an account type.');
          return false;
        }
        return true;

      case 'role':
        return Boolean(institutionalRole);

      case 'account': {
        const nameOk = validateField('fullName');
        const emailOk = validateField('email');
        const passwordOk = validateField('password');
        if (!passwordOk) return false;
        if (getValues('password') !== getValues('confirmPassword')) {
          setError('confirmPassword', { type: 'manual', message: 'Passwords do not match' });
          return false;
        }
        clearErrors('confirmPassword');
        if (identity === 'kid' && !validateField('birthDate')) return false;
        return nameOk && emailOk;
      }

      case 'study':
        if (identity === 'university') {
          if (!universityProgram.trim() || !universitySemester.trim()) {
            toast.error('Enter your degree/program and semester.');
            return false;
          }
          return true;
        }
        if (!getValues('gradeLevel')) {
          toast.error('Please select your class.');
          return false;
        }
        return true;

      case 'school':
        if (!selectedSchool) {
          toast.error('Search and select your institution first.');
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

  const onSubmit = async (data: FormData) => {
    const isInstitutional = identity === 'institutional';
    const studentEducation =
      identity === 'university'
        ? 'university'
        : effectiveRole === 'student'
          ? educationLevelFromGrade(data.gradeLevel)
          : undefined;

    if (effectiveRole === 'student' && identity !== 'kid' && !data.gradeLevel && identity !== 'university') {
      toast.error('Please select your class.');
      return;
    }

    if (effectiveRole === 'student' && identity === 'university' && (!universityProgram.trim() || !universitySemester.trim())) {
      toast.error('Enter your degree/program and semester.');
      return;
    }

    if (isInstitutional && !selectedSchool) {
      toast.error('Search and select your institution first.');
      return;
    }

    if (isInstitutional && institutionalRole === 'student' && !data.gradeLevel) {
      toast.error('Please select your class.');
      return;
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    try {
      const emailResponse = await fetch(`/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
      const emailJson = await emailResponse.json().catch(() => ({ available: true }));
      if (emailResponse.ok && emailJson.available === false) {
        toast.error(
          <span>
            An account with this email already exists.{' '}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="underline">
              Log in instead
            </Link>
            .
          </span>
        );
        return;
      }
    } catch {
      // Supabase signUp remains the final duplicate-email safeguard.
    }

    try {
      await verifyAuthRecaptcha('auth_signup');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Security verification failed. Please try again.');
      return;
    }

    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const metadata: Record<string, unknown> = {
      full_name: data.fullName.trim(),
      role: effectiveRole,
      preferred_language: preferredLanguage,
      board: null,
      grade_level:
        effectiveRole === 'student' && identity !== 'university' && identity !== 'kid'
          ? data.gradeLevel
          : isInstitutional && institutionalRole === 'student'
            ? data.gradeLevel
            : undefined,
      education_level: studentEducation,
      university_program: identity === 'university' ? universityProgram.trim() : undefined,
      university_semester: identity === 'university' ? universitySemester.trim() : undefined,
      academic_institution_name: undefined,
      academic_institution_type: undefined,
      date_of_birth: effectiveRole === 'student' && identity === 'kid' ? data.birthDate || undefined : undefined,
      signup_institution_id: isInstitutional ? selectedSchool?.id : undefined,
      signup_role_requested: isInstitutional ? institutionalRole : undefined,
    };

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: data.password,
      options: {
        data: metadata,
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

      const referralCode = searchParams.get('ref');
      if (referralCode) {
        fetch('/api/referral/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: referralCode }),
        }).catch(() => {});
      }

      const normalDestination =
        effectiveRole === 'parent'
          ? '/parent'
          : isYoungChild
            ? '/kids'
            : '/dashboard';

      router.push(normalDestination);
      router.refresh();
      return;
    }

    toast.success('Account created. Check your email.');
    window.sessionStorage.setItem('ilm-ai-pending-verification-email', normalizedEmail);
    router.push('/verify-email');
  };

  const availableGrades = GRADE_LEVELS;

  return (
    <div className="w-full">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t('auth.register.title')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{currentStep.description}</p>
          </div>
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
        <div className="flex gap-1.5" aria-label={`Signup step ${stepIndex + 1} of ${steps.length}`}>
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index <= stepIndex ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {currentStep.id === 'account' && identity !== 'institutional' && identity !== 'kid' && (
        <div className="mb-5">
          <OAuthButtons
            action="Register"
            role={identity === 'parent' ? 'parent' : 'student'}
            educationLevel={identity === 'university' ? 'university' : 'school'}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">{t('auth.register.orEmail')}</span>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) void handleSubmit(onSubmit)();
          else void goNext();
        }}
        className="space-y-5"
      >
        <div className="space-y-5">
          <h2 className="text-xl font-bold">{currentStep.title}</h2>

          {currentStep.id === 'identity' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['school-college', 'School/College Student', 'Start with your class-based learning tools.'],
                ['university', 'University Student', 'Start with University Hub and university resources.'],
                ['parent', 'Parent', 'Track a child’s learning.'],
                ['kid', 'I’m a Kid 🎈', 'A simple flow for young learners.'],
                ['institutional', 'Join an Institution', 'Join a school or college already on ilm AI.'],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const next = value as SignupIdentity;
                    setIdentity(next);
                    setStepIndex(0);
                    setSelectedSchool(null);
                    setSchoolQuery('');
                    if (next === 'institutional') setInstitutionalRole('student');
                  }}
                  aria-pressed={identity === value}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all',
                    identity === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-1 block text-xs leading-5">{description}</span>
                </button>
              ))}
            </div>
          )}

          {currentStep.id === 'role' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInstitutionalRole('student')}
                  aria-pressed={institutionalRole === 'student'}
                  className={cn(
                    'rounded-xl border-2 p-5 text-center transition-all',
                    institutionalRole === 'student'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card/70 text-muted-foreground'
                  )}
                >
                  <GraduationCap className="mx-auto mb-2 h-7 w-7" />
                  <span className="block font-semibold">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstitutionalRole('teacher')}
                  aria-pressed={institutionalRole === 'teacher'}
                  className={cn(
                    'rounded-xl border-2 p-5 text-center transition-all',
                    institutionalRole === 'teacher'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card/70 text-muted-foreground'
                  )}
                >
                  <Presentation className="mx-auto mb-2 h-7 w-7" />
                  <span className="block font-semibold">Teacher</span>
                </button>
              </div>
              <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-center text-xs">
                A new school or college is created through ilm AI’s admin setup. This flow is only for joining an existing institution.
              </p>
            </div>
          )}

          {currentStep.id === 'account' && (
            <div className="space-y-4">
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

              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-medium">
                  Password
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
                    onClick={() => setShowPass((value) => !value)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="text-muted-foreground absolute top-5 right-3"
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

              {identity === 'kid' && (
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
                </div>
              )}

              <div className="border-border bg-card/60 rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">Language</span>
                  <span className="text-muted-foreground text-xs">Change later in Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'en' as Locale, label: 'English' },
                    { value: 'roman-ur' as Locale, label: 'Roman Urdu' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPreferredLanguage(option.value);
                        setLocale(option.value);
                      }}
                      aria-pressed={preferredLanguage === option.value}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        preferredLanguage === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      <Languages className="mr-1.5 inline h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'school' && (
            <div>
              <label htmlFor="signup-school-search" className="mb-2 block text-sm font-medium">
                Institution name
              </label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="signup-school-search"
                  value={schoolQuery}
                  onChange={(event) => {
                    setSchoolQuery(event.target.value);
                    setSelectedSchool(null);
                  }}
                  autoComplete="off"
                  placeholder="Start typing your institution’s name"
                  className="pl-9"
                />
              </div>
              {selectedSchool ? (
                <div className="border-primary bg-primary/10 text-primary mt-3 flex items-center justify-between gap-2 rounded-xl border-2 p-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {selectedSchool.name}
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
                      No institution found by that name. Ask your school to set up its account first.
                    </p>
                  )}
                </>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                Your request is sent to the institution admin for approval.
              </p>
            </div>
          )}

          {currentStep.id === 'study' && identity === 'university' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Degree / Program</label>
                <Input
                  value={universityProgram}
                  onChange={(event) => setUniversityProgram(event.target.value)}
                  placeholder="e.g. BS Computer Science"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Semester</label>
                <Input
                  value={universitySemester}
                  onChange={(event) => setUniversitySemester(event.target.value)}
                  placeholder="e.g. Semester 3"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Courses, exam targets, and other personalization can be added later in Settings.
              </p>
            </div>
          )}

          {currentStep.id === 'study' && identity !== 'university' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableGrades.map((grade) => {
                const isSelected = selectedGrade === grade.value;
                return (
                  <button
                    key={grade.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setValue('gradeLevel', grade.value, { shouldValidate: true })}
                    className={cn(
                      'rounded-xl border-2 px-4 py-4 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card/70 hover:border-primary/40'
                    )}
                  >
                    <span className="block text-sm font-bold">{grade.label}</span>
                    <span className="text-muted-foreground text-xs">{grade.level}</span>
                  </button>
                );
              })}
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
              disabled={isSubmitting}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            type={isLastStep ? 'submit' : 'button'}
            variant="gradient"
            className="flex-1"
            size="lg"
            loading={isSubmitting}
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
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
