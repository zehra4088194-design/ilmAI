'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setHasRecoverySession(Boolean(data.user));
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Password updated. Log in with your new password.');
    router.replace('/login?password=updated');
    router.refresh();
  };

  if (checkingSession) {
    return <p className="text-muted-foreground text-center text-sm">Checking secure reset session...</p>;
  }

  if (!hasRecoverySession) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold">Reset link is invalid</h1>
        <p className="text-muted-foreground mb-6">
          Use the link or code from your email again to set a new password.
        </p>
        <Button asChild variant="gradient" className="w-full">
          <Link href="/forgot-password">Request a New Link and Code</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Create a new password</h1>
      <p className="text-muted-foreground mb-8">Use a secure password with at least 8 characters.</p>
      <form onSubmit={handleReset} className="space-y-4">
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" variant="gradient" className="w-full" size="lg" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
