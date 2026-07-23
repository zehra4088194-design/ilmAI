'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, MailCheck, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { THEME_COOKIE_NAME } from '@/lib/constants/themes';
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/config';
import { getBrowserSiteUrl } from '@/lib/utils/siteUrl';

const PENDING_EMAIL_KEY = 'ilm-ai-pending-verification-email';

export function VerifyEmailForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setEmail(window.sessionStorage.getItem(PENDING_EMAIL_KEY) || '');
  }, []);

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Enter the email address used to create your account.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    });

    if (error || !data.user) {
      setVerifying(false);
      toast.error(error?.message || 'The code could not be verified.');
      return;
    }

    const profileResponse = await fetch('/api/auth/ensure-profile', { method: 'POST' });
    if (!profileResponse.ok) {
      setVerifying(false);
      toast.error('Email verified, but profile setup failed. Please log in and try again.');
      return;
    }

    const metadata = data.user.user_metadata || {};
    const role = metadata.role === 'parent' ? 'parent' : 'student';
    const educationLevel = metadata.education_level;
    const gender = metadata.gender;
    const preferredLanguage = metadata.preferred_language === 'roman-ur' ? 'roman-ur' : 'en';
    document.cookie = `${LOCALE_COOKIE_NAME}=${preferredLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (role === 'student' && (gender === 'girl' || gender === 'boy')) {
      const genderTheme = gender === 'girl' ? 'theme-pink-light' : 'theme-midnight-dark';
      window.localStorage.setItem('theme', genderTheme);
      document.cookie = `${THEME_COOKIE_NAME}=${genderTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.localStorage.setItem('ilm-ai-gender-theme-user', data.user.id);
    }

    window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
    toast.success('Email verified successfully.');
    const destination =
      role === 'parent'
        ? '/parent'
        : educationLevel === 'university'
          ? '/onboarding/complete-profile'
          : '/onboarding/class';
    window.location.assign(destination);
  };

  const resendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Enter your signup email first.');
      return;
    }

    setResending(true);
    const callbackUrl = new URL('/api/auth/callback', getBrowserSiteUrl());
    callbackUrl.searchParams.set('redirect', '/dashboard');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { emailRedirectTo: callbackUrl.toString() },
    });
    setResending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    window.sessionStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail);
    toast.success('A new verification link and code have been sent.');
  };

  return (
    <div>
      <div className="bg-primary/10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
        <MailCheck className="text-primary h-8 w-8" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold">Verify your email</h1>
      <p className="text-muted-foreground mb-6 text-center text-sm">
        ilm AI sends a verification link and a 6-digit code. Open the link or enter the code here.
      </p>

      <form onSubmit={verifyCode} className="space-y-4">
        <div className="relative">
          <MailCheck className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Signup email"
            autoComplete="email"
            required
            className="pl-10"
          />
        </div>
        <div className="relative">
          <KeyRound className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-label="Email verification code"
            required
            className="h-14 pr-3 pl-10 text-center font-mono text-2xl tracking-[0.4em]"
          />
        </div>
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={verifying}>
          Verify code
        </Button>
      </form>

        <Button type="button" variant="outline" className="mt-3 w-full" onClick={resendCode} loading={resending}>
        <RotateCw className="h-4 w-4" /> Resend link and code
      </Button>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already verified?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
