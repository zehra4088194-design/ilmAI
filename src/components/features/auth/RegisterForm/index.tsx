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
  Mail,
  School,
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
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';
import { THEME_COOKIE_NAME } from '@/lib/constants/themes';

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
});

const schema = formSchema.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords match nahi karte',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type AccountType = 'student' | 'parent';
type Gender = 'girl' | 'boy';
type SignupStepId =
  'name' | 'email' | 'password' | 'username' | 'gender' | 'education' | 'institution' | 'grade' | 'board';

type SignupStep = {
  id: SignupStepId;
  title: string;
  description: string;
};

const BASE_STEPS: SignupStep[] = [
  { id: 'name', title: 'Aapka naam?', description: 'Pehle sirf woh naam jo app mein show hoga.' },
  { id: 'email', title: 'Email address', description: 'Login aur account recovery ke liye.' },
  {
    id: 'password',
    title: 'Secure password',
    description: 'Browser ka suggested strong password bhi use kar sakte hain.',
  },
  { id: 'username', title: 'Unique username', description: 'Isi @username se search aur Study Buddies mein milenge.' },
];

const STUDENT_STEPS: SignupStep[] = [
  { id: 'gender', title: 'Girl ya boy?', description: 'Study Buddies privacy aur default theme ke liye.' },
  {
    id: 'education',
    title: 'Aap kahan study karte hain?',
    description: 'School, college ya university select karein.',
  },
  {
    id: 'institution',
    title: 'Institution ka naam',
    description: 'Apne school, college ya university ka naam likhein.',
  },
];

const SCHOOL_STEPS: SignupStep[] = [
  { id: 'grade', title: 'Aapki class?', description: 'Isi class ke lectures, notes aur papers show honge.' },
  { id: 'board', title: 'Aapka board?', description: 'Aakhri step. Board-specific content isi se filter hoga.' },
];

export function getSignupSteps(accountType: AccountType, educationLevel: EducationLevel) {
  if (accountType === 'parent') return BASE_STEPS;
  return [...BASE_STEPS, ...STUDENT_STEPS, ...(educationLevel === 'university' ? [] : SCHOOL_STEPS)];
}

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [gender, setGender] = useState<Gender | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  const steps = useMemo(() => getSignupSteps(accountType, educationLevel), [accountType, educationLevel]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]!;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

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
    },
  });
  const selectedGrade = watch('gradeLevel');

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
    };
    const field = fieldByStep[currentStep.id];
    if (!field) return;
    const timer = window.setTimeout(() => setFocus(field), 80);
    return () => window.clearTimeout(timer);
  }, [currentStep.id, setFocus]);

  const checkUsername = async () => {
    const username = getValues('username').trim().toLowerCase();
    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const json = await response.json().catch(() => ({ available: false }));
      if (!response.ok || json.available !== true) {
        toast.error(json.error || 'Username already taken hai');
        return false;
      }
      setValue('username', username, { shouldValidate: true });
      return true;
    } catch {
      toast.error('Username check nahi ho saka. Dobara try karein.');
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
          setError('confirmPassword', { type: 'manual', message: 'Passwords match nahi karte' });
          return false;
        }
        clearErrors('confirmPassword');
        return true;
      }
      case 'username': {
        if (!validateField('username')) return false;
        return checkUsername();
      }
      case 'gender':
        if (!gender) {
          toast.error('Girl ya boy select karo');
          return false;
        }
        return true;
      case 'institution':
        if ((getValues('institutionName') || '').trim().length < 2) {
          toast.error('Apne institution ka valid naam likhein');
          return false;
        }
        return true;
      case 'grade':
        if (!getValues('gradeLevel')) {
          toast.error('Apni class select karein');
          return false;
        }
        return true;
      case 'board':
        if (!getValues('board')) {
          toast.error('Apna board select karo');
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
    setStepIndex(0);
    if (nextType === 'parent') setGender(null);
  };

  const onSubmit = async (data: FormData) => {
    if (accountType === 'student') {
      if (!gender) {
        toast.error('Girl ya boy select karo');
        return;
      }
      if (!data.institutionName?.trim()) {
        toast.error('Apne institution ka naam likhein');
        return;
      }
      if (educationLevel !== 'university' && (!data.gradeLevel || !data.board)) {
        toast.error('Apni class aur board select karein');
        return;
      }
    }

    if (!(await checkUsername())) return;

    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          username: data.username.trim().toLowerCase(),
          role: accountType,
          board: accountType === 'student' && educationLevel !== 'university' ? data.board : undefined,
          grade_level: accountType === 'student' && educationLevel !== 'university' ? data.gradeLevel : undefined,
          education_level: accountType === 'student' ? educationLevel : undefined,
          academic_institution_name: accountType === 'student' ? data.institutionName?.trim() || undefined : undefined,
          academic_institution_type: accountType === 'student' ? educationLevel : undefined,
          gender: accountType === 'student' ? gender : undefined,
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
        toast.error('Profile setup nahi ho saka. Dobara login karke try karein.');
        return;
      }
      toast.success('Account ban gaya!');
      if (accountType === 'student' && gender) {
        const genderTheme = gender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark';
        window.localStorage.setItem('theme', genderTheme);
        document.cookie = `${THEME_COOKIE_NAME}=${genderTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.localStorage.setItem('ilm-ai-gender-theme-user', signUpData.user?.id || data.email);
      }
      router.push(
        accountType === 'parent'
          ? '/parent'
          : educationLevel === 'university'
            ? '/onboarding/complete-profile'
            : redirect
      );
      router.refresh();
      return;
    }

    toast.success('Account ban gaya! Email check karo.');
    window.sessionStorage.setItem('ilm-ai-pending-verification-email', data.email.trim().toLowerCase());
    router.push('/verify-email');
  };

  const availableGrades = GRADE_LEVELS.filter((grade) => {
    if (educationLevel === 'school') return ['GRADE_9', 'GRADE_10', 'O_LEVEL'].includes(grade.value);
    return ['GRADE_11', 'GRADE_12', 'A_LEVEL'].includes(grade.value);
  });

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
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

      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeAccountType('student')}
          aria-pressed={accountType === 'student'}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all',
            accountType === 'student'
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
          )}
        >
          <GraduationCap className="h-4 w-4" /> {t('auth.register.student')}
        </button>
        <button
          type="button"
          onClick={() => changeAccountType('parent')}
          aria-pressed={accountType === 'parent'}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all',
            accountType === 'parent'
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border bg-card/80 text-muted-foreground hover:border-primary/40'
          )}
        >
          <Users className="h-4 w-4" /> {t('auth.register.parent')}
        </button>
      </div>

      {isFirstStep && (
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
                <ShieldCheck className="text-primary h-4 w-4" /> Chrome ka strong password suggestion ab supported hai.
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
                Letters, numbers, dot aur underscore. Har username unique hoga.
              </p>
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
                  autoComplete="organization"
                  placeholder={`Apne ${educationLevel} ka naam`}
                  className="pl-10"
                  error={errors.institutionName?.message}
                />
              </div>
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
                    ? 'India detect hui, CBSE default select hua hai.'
                    : 'Pakistan detect hua, FBISE default select hua hai.'}
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
                {accountType === 'parent' ? t('auth.register.submitParent') : t('auth.register.submitStudent')}
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
