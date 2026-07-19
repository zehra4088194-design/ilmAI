'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { completeUsername } from '@/app/onboarding/complete-profile/actions';

export function UsernameStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const next = searchParams.get('next') || '/dashboard';

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeUsername(username);
      if (!result.success) {
        setError(result.error || 'The username could not be saved.');
        return;
      }
      router.replace(next.startsWith('/') ? next : '/dashboard');
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <div className="bg-primary/15 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Choose your username</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This unique username will be used for admin search and Study Buddies.
        </p>
      </div>
      <div className="space-y-3">
        <Input
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          placeholder="e.g. ahmad.study"
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        />
        <p className="text-muted-foreground text-xs">3-30 characters: letters, numbers, dots, or underscores.</p>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button className="w-full" variant="gradient" onClick={submit} loading={isPending}>
          Save username
        </Button>
      </div>
    </div>
  );
}
