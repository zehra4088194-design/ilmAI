'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UserPlus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type JoinStatus = 'idle' | 'linking' | 'success' | 'error';

export function ParentLinkJoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<JoinStatus>('idle');
  const [message, setMessage] = useState('Parent account se link kar rahe hain...');

  useEffect(() => {
    let cancelled = false;

    async function linkParent() {
      setStatus('linking');
      try {
        const res = await fetch('/api/parent/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: code }),
        });
        const json = await res.json();

        if (cancelled) return;

        if (json.status === 'error') {
          setStatus('error');
          setMessage(json.error || 'Parent link nahi ho saka');
          return;
        }

        setStatus('success');
        setMessage(json.message || 'Parent account se successfully link ho gaya!');
        setTimeout(() => {
          router.push('/settings');
          router.refresh();
        }, 1200);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Connection issue ki wajah se parent link nahi ho saka.');
        }
      }
    }

    linkParent();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
          {status === 'success' ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : status === 'error' ? (
            <XCircle className="h-7 w-7" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin" />
          )}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent Link</p>
        <h1 className="mt-2 text-2xl font-bold">
          {status === 'success' ? 'Linked' : status === 'error' ? 'Link failed' : 'Linking...'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm tracking-widest">{code}</p>
        {status === 'error' && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/settings">Open Settings</Link>
            </Button>
            <Button asChild variant="gradient" className="flex-1">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ParentLinkSignedOut({ code }: { code: string }) {
  const redirect = `/parent-link?code=${encodeURIComponent(code)}`;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
          <UserPlus className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent Link</p>
        <h1 className="mt-2 text-2xl font-bold">Student account se continue karo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Login ya new account banane ke baad ye parent code automatically attach ho jayega.
        </p>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm tracking-widest">{code}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="gradient">
            <Link href={`/register?redirect=${encodeURIComponent(redirect)}`}>Create Account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
