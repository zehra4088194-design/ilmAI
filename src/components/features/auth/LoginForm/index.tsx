'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, MailCheck, Lock, RotateCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { OAuthButtons } from '@/components/features/auth/OAuthButtons';
import { toast } from 'sonner';
import { useTranslations } from '@/providers/I18nProvider';

const schema = z.object({ email: z.string().email('Valid email required'), password: z.string().min(6, 'Min 6 characters') });
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();
  const t = useTranslations();
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const finishLogin = () => {
    toast.success('Welcome back!');
    router.push(redirect);
    router.refresh();
  };

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) { toast.error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message); return; }
    finishLogin();
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
    const callbackUrl = new URL('/api/auth/callback', window.location.origin);
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
    finishLogin();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">{t('auth.login.title')}</h1>
        <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
      </div>
      {emailLinkSent ? (
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
              className="text-primary block mx-auto text-sm font-medium hover:underline"
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
                className="text-muted-foreground hover:text-foreground block mx-auto text-xs hover:underline"
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
            className="text-primary block mx-auto text-sm font-medium hover:underline"
          >
            Use password instead
          </button>
        </div>
      ) : (
        <>
          <OAuthButtons />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('auth.login.orEmail')}</span></div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input {...register('email')} type="email" placeholder={t('auth.login.emailPlaceholder')} className="pl-10" error={errors.email?.message} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input {...register('password')} type={showPass ? 'text' : 'password'} placeholder={t('auth.login.passwordPlaceholder')} className="pl-10 pr-10" error={errors.password?.message} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">{t('auth.login.forgotPassword')}</Link>
            </div>
            <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isSubmitting}>
              <Zap className="w-4 h-4" /> {t('auth.login.submit')}
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
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t('auth.login.noAccount')}{' '}
        <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-primary font-medium hover:underline">{t('auth.login.registerLink')}</Link>
      </p>
    </div>
  );
}
