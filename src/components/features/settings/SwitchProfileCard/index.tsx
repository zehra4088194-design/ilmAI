'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { getBrowserSiteUrl } from '@/lib/utils/siteUrl';

type LinkedAccount = {
  id: string;
  maskedEmail: string;
  role: string;
  fullName: string | null;
};

export function SwitchProfileCard() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linking, setLinking] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<LinkedAccount | null>(null);

  const loadAccounts = () => {
    setLoading(true);
    fetch('/api/settings/linked-accounts')
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success') setAccounts(json.data.linkedAccounts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLink = async () => {
    if (!linkEmail.trim() || !linkPassword) {
      toast.error('Enter the other account’s email and password.');
      return;
    }
    setLinking(true);
    try {
      const res = await fetch('/api/settings/linked-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkEmail.trim(), password: linkPassword }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        toast.error(json.error || 'Could not link this account.');
        return;
      }
      toast.success('Account linked.');
      setLinkEmail('');
      setLinkPassword('');
      setLinkOpen(false);
      loadAccounts();
    } catch {
      toast.error('Could not link this account.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (id: string) => {
    const { error } = await supabase.from('linked_accounts' as any).delete().eq('id', id);
    if (error) {
      toast.error('Could not remove this linked account.');
      return;
    }
    toast.success('Linked account removed.');
    setAccounts((current) => current.filter((account) => account.id !== id));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <ArrowLeftRight className="h-4 w-4 text-violet-400" />
          Switch Profile
        </h3>
        <p className="text-muted-foreground text-sm">
          Link another one of your own ilm AI accounts (e.g. a separate teacher or student
          account) and move between them here after confirming its password each time.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No linked accounts yet.</p>
      ) : (
        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-semibold capitalize">{account.role}</p>
                  <p className="text-muted-foreground text-xs">{account.maskedEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="gradient" size="sm" onClick={() => setSwitchTarget(account)}>
                    Switch
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove linked account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this linked account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You can link it again later by re-entering its password.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUnlink(account.id)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!linkOpen ? (
        <Button type="button" variant="outline" onClick={() => setLinkOpen(true)}>
          + Link another account
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link another account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Its email</label>
              <Input
                type="email"
                value={linkEmail}
                onChange={(event) => setLinkEmail(event.target.value)}
                placeholder="the.other.account@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Its password</label>
              <Input
                type="password"
                value={linkPassword}
                onChange={(event) => setLinkPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setLinkOpen(false)} disabled={linking}>
                Cancel
              </Button>
              <Button type="button" variant="gradient" onClick={handleLink} loading={linking}>
                Link account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SwitchAccountDialog account={switchTarget} onClose={() => setSwitchTarget(null)} />
    </div>
  );
}

function SwitchAccountDialog({ account, onClose }: { account: LinkedAccount | null; onClose: () => void }) {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPassword('');
    setStep('password');
    setMfaChallenge(null);
    setMfaCode('');
    setError(null);
    setPending(false);
  }, [account]);

  const recordAttempt = (success: boolean) => {
    if (!account) return;
    fetch(`/api/settings/linked-accounts/${account.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success }),
    }).catch(() => {});
  };

  const finishSwitch = async () => {
    recordAttempt(true);
    let destination = '/dashboard';
    try {
      const res = await fetch('/api/auth/post-login-destination?redirect=/dashboard');
      const json = await res.json();
      if (typeof json.destination === 'string') destination = json.destination;
    } catch {
      // Keep the fallback destination if the lookup fails.
    }
    window.location.assign(new URL(destination, getBrowserSiteUrl()).toString());
  };

  // Mirrors LoginForm's prepareMfaIfRequired() exactly — this only works from the browser client
  // that just adopted the target's session, since it reads THAT session's assurance level.
  const prepareMfaIfRequired = async () => {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data.nextLevel !== 'aal2' || assurance.data.currentLevel === 'aal2') return false;

    const factors = await supabase.auth.mfa.listFactors();
    const factor = factors.data?.totp?.find((item) => item.status === 'verified');
    if (factors.error || !factor) return false;

    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) {
      setError(challenge.error.message);
      return true;
    }
    setMfaChallenge({ factorId: factor.id, challengeId: challenge.data.id });
    setStep('mfa');
    return true;
  };

  const handlePasswordSubmit = async () => {
    if (!account || !password) return;
    setError(null);
    setPending(true);
    try {
      const prep = await fetch(`/api/settings/linked-accounts/${account.id}`);
      const prepJson = await prep.json();
      if (prepJson.status !== 'success') {
        setError(prepJson.error || 'Could not switch to this account.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: prepJson.data.email,
        password,
      });
      if (signInError) {
        recordAttempt(false);
        setError('Incorrect password.');
        return;
      }

      if (await prepareMfaIfRequired()) return;
      await finishSwitch();
    } finally {
      setPending(false);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaChallenge || !/^\d{6}$/.test(mfaCode)) {
      setError('Enter the 6-digit code from the authenticator app.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode,
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      await finishSwitch();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={Boolean(account)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'mfa' ? 'Two-step verification' : `Switch to ${account?.role ?? 'this'} account`}
          </DialogTitle>
          <DialogDescription>
            {step === 'mfa'
              ? 'Enter the 6-digit code from that account’s authenticator app.'
              : `Confirm ${account?.maskedEmail ?? 'this account'}’s password to switch.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'password' ? (
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error || undefined}
          />
        ) : (
          <Input
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-xl tracking-[0.4em]"
            error={error || undefined}
          />
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            loading={pending}
            onClick={step === 'password' ? handlePasswordSubmit : handleMfaSubmit}
            disabled={step === 'password' ? !password : mfaCode.length !== 6}
          >
            <ShieldCheck className="h-4 w-4" /> {step === 'mfa' ? 'Verify and switch' : 'Switch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
