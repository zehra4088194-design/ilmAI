'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, MailCheck, Lock, RotateCw, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { getBrowserSiteUrl } from '@/lib/utils/siteUrl';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';
import { verifyAuthRecaptcha } from '@/lib/security/recaptcha-client';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Min 6 characters'),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const [showPass, setShowPass] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const hasExplicitRedirect = searchParams.has('redirect');
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const finishLogin = async () => {
    toast.success('Welcome back!');
    let destination = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
    if (!hasExplicitRedirect) {
      try {
        const response = await fetch('/api/auth/post-login-destination');
        const data = await response.json();
        if (typeof data.destination === 'string') destination = data.destination;
      } catch {
        // Keep the default '/dashboard' destination if the lookup fails.
      }
    }
    window.location.assign(new URL(destination, getBrowserSiteUrl()).toString());
  };

  const prepareMfaIfRequired = async () => {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data.nextLevel !== 'aal2' || assurance.data.currentLevel === 'aal2') return false;

    const factors = await supabase.auth.mfa.listFactors();
    const factor = factors.data?.totp?.find((item) => item.status === 'verified');
    if (factors.error || !factor) return false;

    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) {
      toast.error(challenge.error.message);
      return true;
    }

    setMfaChallenge({ factorId: factor.id, challengeId: challenge.data.id });
    setMfaCode('');
    setMfaError(null);
    return true;
  };

  const onSubmit = async (data: FormData) => {
    try {
      await verifyAuthRecaptcha('auth_login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Security verification failed. Please try again.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      return;
    }
    if (await prepareMfaIfRequired()) return;
    await finishLogin();
  };

  const sendMagicLink = async () => {
    const email = getValues('email').trim().toLowerCase();
    const emailResult = z.string().email('Valid email required').safeParse(email);
    if (!emailResult.success) {
      toast.error('Enter a valid email address first.');
      return;
    }

    setMagicLinkLoading(true);
    setOtpError(null);
    try {
      await verifyAuthRecaptcha('auth_magic_link');
    } catch (error) {
      setMagicLinkLoading(false);
      toast.error(error instanceof Error ? error.message : 'Security verification failed. Please try again.');
      return;
    }
    const callbackUrl = new URL('/api/auth/callback', getBrowserSiteUrl());
    callbackUrl.searchParams.set('redirect', redirect);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: false,
      },
    });
    setMagicLinkLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicEmail(email);
    setEmailLinkSent(true);
    setShowOtp(false);
    setOtpCode('');
  };

  const verifyMagicCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: magicEmail,
      token: otpCode,
      type: 'email',
    });
    setOtpLoading(false);
    if (error || !data.user) {
      setOtpError(error?.message || 'This code is invalid or has expired. Request a new code and try again.');
      return;
    }
    if (await prepareMfaIfRequired()) return;
    await finishLogin();
  };

  const verifyMfaCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaChallenge || !/^\d{6}$/.test(mfaCode)) {
      setMfaError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaChallenge.factorId,
      challengeId: mfaChallenge.challengeId,
      code: mfaCode,
    });
    setMfaLoading(false);
    if (error) {
      setMfaError(error.message);
      return;
    }
    await finishLogin();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold">{t('auth.login.title')}</h1>
        <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
      </div>
      {mfaChallenge ? (
        <form onSubmit={verifyMfaCode} className="space-y-4">
          <div className="bg-primary/10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <ShieldCheck className="text-primary h-7 w-7" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Two-step verification</h2>
            <p className="text-muted-foreground mt-1 text-sm">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <Input
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-label="Authenticator code"
            className="h-14 text-center font-mono text-2xl tracking-[0.45em]"
            error={mfaError || undefined}
          />
          <Button type="submit" variant="gradient" className="w-full" size="lg" loading={mfaLoading}>
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setMfaChallenge(null);
              setMfaCode('');
              setMfaError(null);
              void supabase.auth.signOut();
            }}
            className="text-muted-foreground hover:text-foreground mx-auto block text-xs hover:underline"
          >
            Use another account
          </button>
        </form>
      ) : emailLinkSent ? (
        <div className="space-y-4">
          <div className="bg-primary/10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <MailCheck className="text-primary h-7 w-7" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              We sent a sign-in link and a 6-digit backup code to{' '}
              <span className="text-foreground font-medium">{magicEmail}</span>.
            </p>
          </div>

          {!showOtp ? (
            <button
              type="button"
              onClick={() => setShowOtp(true)}
              className="text-primary mx-auto block text-sm font-medium hover:underline"
            >
              Enter code instead
            </button>
          ) : (
            <form onSubmit={verifyMagicCode} className="space-y-3">
              <Input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                aria-label="Email sign-in code"
                className="h-14 text-center font-mono text-2xl tracking-[0.45em]"
                error={otpError || undefined}
              />
              <Button type="submit" variant="gradient" className="w-full" size="lg" loading={otpLoading}>
                Verify code
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtpError(null);
                }}
                className="text-muted-foreground hover:text-foreground mx-auto block text-xs hover:underline"
              >
                Use email link instead
              </button>
            </form>
          )}

          <Button type="button" variant="outline" className="w-full" onClick={sendMagicLink} loading={magicLinkLoading}>
            <RotateCw className="h-4 w-4" /> Resend link and code
          </Button>
          <button
            type="button"
            onClick={() => {
              setEmailLinkSent(false);
              setShowOtp(false);
              setOtpCode('');
              setOtpError(null);
            }}
            className="text-primary mx-auto block text-sm font-medium hover:underline"
          >
            Use password instead
          </button>
        </div>
      ) : (
        <>
          <OAuthButtons />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">{t('auth.login.orEmail')}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                {...register('email')}
                type="email"
                placeholder={t('auth.login.emailPlaceholder')}
                className="pl-10"
                error={errors.email?.message}
              />
            </div>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder={t('auth.login.passwordPlaceholder')}
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
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-primary text-sm hover:underline">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
              <Zap className="h-4 w-4" /> {t('auth.login.submit')}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <span className="border-border flex-1 border-t" />
            <span className="text-muted-foreground text-xs">or</span>
            <span className="border-border flex-1 border-t" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={sendMagicLink} loading={magicLinkLoading}>
            <MailCheck className="h-4 w-4" /> Sign in with email link
          </Button>
        </>
      )}
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t('auth.login.noAccount')}{' '}
        <Link
          href={`/register?redirect=${encodeURIComponent(redirect)}`}
          className="text-primary font-medium hover:underline"
        >
          {t('auth.login.registerLink')}
        </Link>
      </p>
    </div>
  );
}
