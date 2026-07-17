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
      toast.error('Password kam az kam 8 characters ka rakho.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Dono passwords match nahi karte.');
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
    toast.success('Password update ho gaya. Ab naye password se login karo.');
    router.replace('/login?password=updated');
    router.refresh();
  };

  if (checkingSession) {
    return <p className="text-muted-foreground text-center text-sm">Secure reset session check ho rahi hai...</p>;
  }

  if (!hasRecoverySession) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold">Reset Link Invalid Hai</h1>
        <p className="text-muted-foreground mb-6">
          Naya password set karne ke liye email wala link ya code dobara use karo.
        </p>
        <Button asChild variant="gradient" className="w-full">
          <Link href="/forgot-password">Naya Link Aur Code Lo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Naya Password Banao</h1>
      <p className="text-muted-foreground mb-8">Kam az kam 8 characters ka secure password rakho.</p>
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
          Password Update Karo
        </Button>
      </form>
    </div>
  );
}
