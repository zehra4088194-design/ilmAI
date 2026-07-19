'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Mail, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const sendRecoveryEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/api/auth/recovery`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmail(normalizedEmail);
    setSent(true);
    toast.success('Password reset link and code have been sent.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendRecoveryEmail();
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    setVerifying(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Code verified. Set a new password.');
    router.replace('/reset-password');
    router.refresh();
  };

  if (sent) {
    return (
      <div>
        <div className="bg-primary/10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
          <KeyRound className="text-primary h-8 w-8" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          ilm AI sent a reset link and a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
          Use either option.
        </p>

        <form onSubmit={verifyCode} className="space-y-4">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-label="Password reset code"
            className="h-14 text-center font-mono text-2xl tracking-[0.45em]"
          />
          <Button type="submit" variant="gradient" className="w-full" size="lg" loading={verifying}>
            Verify code
          </Button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={sendRecoveryEmail} loading={loading}>
            <RotateCw className="h-4 w-4" /> Resend
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSent(false);
              setCode('');
            }}
          >
            Change email
          </Button>
        </div>

        <Link
          href="/login"
          className="text-primary mt-6 flex items-center justify-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Return to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Forgot your password?</h1>
      <p className="text-muted-foreground mb-8">Enter your email and ilm AI will send a reset link and 6-digit code.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={loading}>
          Link Aur Code Bhejo
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link href="/login" className="text-primary flex items-center justify-center gap-1 text-sm hover:underline">
          <ArrowLeft className="h-3 w-3" /> Return to login
        </Link>
      </div>
    </div>
  );
}
