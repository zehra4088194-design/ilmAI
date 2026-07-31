'use client';

import { useActionState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_SCHOOL_ACTION_STATE, type SchoolActionState } from '@/lib/school-erp/types';

type SchoolServerAction = (state: SchoolActionState, formData: FormData) => Promise<SchoolActionState>;

export function SchoolActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-3',
}: {
  action: SchoolServerAction;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_SCHOOL_ACTION_STATE);
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
