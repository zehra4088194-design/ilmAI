'use client';

import { useActionState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_QURAN_ACTION_STATE, type QuranActionState } from '@/lib/quran/action-state';

type QuranServerAction = (state: QuranActionState, formData: FormData) => Promise<QuranActionState>;

export function QuranActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-3',
}: {
  action: QuranServerAction;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_QURAN_ACTION_STATE);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.message && (
        <p
          role="status"
          className={`flex items-center gap-2 text-xs ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
        >
          {state.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
