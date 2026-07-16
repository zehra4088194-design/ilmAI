'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Zap, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { BOARDS, COUNTRY_BOARD_DEFAULTS } from '@/lib/constants';
import { EDUCATION_LEVELS, type EducationLevel } from '@/lib/constants/university';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';

const schema = z
  .object({
    fullName: z.string().min(2, 'Min 2 characters'),
    username: z
      .string()
      .min(3, 'Min 3 characters')
      .regex(/^[a-z0-9._]+$/i, 'Letters, numbers, dot and underscore only'),
    email: z.string().email('Valid email required'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string(),
    educationLevel: z.string().optional(),
    board: z.string().optional(),
    gender: z.enum(['girl', 'boy']).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords match nahi karte',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'parent'>('student');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('school');
  const [gender, setGender] = useState<'girl' | 'boy' | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((json) => {
        const country = json?.country as string | undefined;
        if (country && COUNTRY_BOARD_DEFAULTS[country]) {
          setDetectedCountry(country);
          setValue('board', COUNTRY_BOARD_DEFAULTS[country]);
        }
      })
      .catch(() => {});
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    if (accountType === 'student' && educationLevel !== 'university' && !data.board) {
      toast.error('Apna board select karo');
      return;
    }
    if (accountType === 'student' && !gender) {
      toast.error('Girl ya boy select karo');
      return;
    }

    const usernameCheck = await fetch(`/api/auth/check-username?username=${encodeURIComponent(data.username)}`);
    const usernameJson = await usernameCheck.json().catch(() => ({ available: false }));
    if (!usernameCheck.ok || usernameJson.available !== true) {
      toast.error(usernameJson.error || 'Username already taken hai');
      return;
    }

    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          username: data.username.toLowerCase(),
          role: accountType,
          board: accountType === 'student' && educationLevel !== 'university' ? data.board : undefined,
          education_level: accountType === 'student' ? educationLevel : undefined,
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
        window.localStorage.setItem('theme', gender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark');
        window.localStorage.setItem('ilm-ai-gender-theme-user', signUpData.user?.id || data.email);
      }
      router.push(
        accountType === 'parent'
          ? redirect
          : educationLevel === 'university'
            ? '/onboarding/complete-profile'
            : '/onboarding/class'
      );
      router.refresh();
      return;
    }

    toast.success('Account ban gaya! Email check karo.');
    router.push('/verify-email');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">{t('auth.register.title')}</h1>
        <p className="text-muted-foreground">{t('auth.register.subtitle')}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAccountType('student')}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all',
            accountType === 'student'
              ? 'border-violet-500 bg-violet-500/20 shadow-sm shadow-violet-500/15'
              : 'border-border bg-card/80 hover:border-violet-500/40 hover:bg-violet-500/10'
          )}
        >
          <GraduationCap
            className={cn('h-5 w-5', accountType === 'student' ? 'text-violet-400' : 'text-muted-foreground')}
          />
          <span className="text-xs font-medium">{t('auth.register.student')}</span>
        </button>
        <button
          type="button"
          onClick={() => setAccountType('parent')}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all',
            accountType === 'parent'
              ? 'border-violet-500 bg-violet-500/20 shadow-sm shadow-violet-500/15'
              : 'border-border bg-card/80 hover:border-violet-500/40 hover:bg-violet-500/10'
          )}
        >
          <Users className={cn('h-5 w-5', accountType === 'parent' ? 'text-violet-400' : 'text-muted-foreground')} />
          <span className="text-xs font-medium">{t('auth.register.parent')}</span>
        </button>
      </div>

      <OAuthButtons action="Register" role={accountType} />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">{t('auth.register.orEmail')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            {...register('fullName')}
            placeholder={t('auth.register.fullNamePlaceholder')}
            className="pl-10"
            error={errors.fullName?.message}
          />
        </div>

        <div className="relative">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">@</span>
          <Input {...register('username')} placeholder="username" className="pl-8" error={errors.username?.message} />
        </div>

        <div className="relative">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            {...register('email')}
            type="email"
            placeholder={t('auth.register.emailPlaceholder')}
            className="pl-10"
            error={errors.email?.message}
          />
        </div>

        {accountType === 'student' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">You are</label>
              <div className="grid grid-cols-2 gap-2">
                {(['girl', 'boy'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={gender === value}
                    onClick={() => setGender(value)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2.5 text-sm font-semibold capitalize transition-all',
                      gender === value
                        ? value === 'girl'
                          ? 'border-pink-500 bg-pink-500/15 text-pink-500'
                          : 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : 'border-border bg-card/70 text-muted-foreground'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Study Buddies privacy aur aapki default theme is selection se set hogi.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Education level</label>
              <select
                value={educationLevel}
                onChange={(event) => setEducationLevel(event.target.value as EducationLevel)}
                className="border-input bg-background focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            {educationLevel !== 'university' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('auth.register.boardLabel')}</label>
                <select
                  {...register('board')}
                  className="border-input bg-background focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {t('auth.register.boardPlaceholder')}
                  </option>
                  {BOARDS.filter((b) => b.value !== 'OTHER').map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}
            <p className="text-muted-foreground -mt-1 text-xs">
              {detectedCountry === 'IN'
                ? 'India detect hui - CBSE default select ho gaya hai.'
                : detectedCountry === 'PK'
                  ? 'Pakistan detect hua - FBISE default select ho gaya hai.'
                  : ''}{' '}
              {educationLevel === 'university'
                ? 'University details next step mein poochi jayengi.'
                : 'Class onboarding ke next step mein poochi jayegi.'}
            </p>
          </div>
        )}

        <div className="relative">
          <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            {...register('password')}
            type={showPass ? 'text' : 'password'}
            placeholder={t('auth.register.passwordPlaceholder')}
            className="pr-10 pl-10"
            error={errors.password?.message}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Input
          {...register('confirmPassword')}
          type="password"
          placeholder={t('auth.register.confirmPasswordPlaceholder')}
          error={errors.confirmPassword?.message}
        />
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
          <Zap className="h-4 w-4" />{' '}
          {accountType === 'parent' ? t('auth.register.submitParent') : t('auth.register.submitStudent')}
        </Button>
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
