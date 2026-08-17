'use client';

// Mirrors UniversityActionForm — same pattern, own module (Class Library is
// deliberately separate platform-wide content, not an institution ERP).
import { useActionState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_CLASS_LIBRARY_ACTION_STATE, type ClassLibraryActionState } from '@/lib/class-library/types';

type ClassLibraryServerAction = (state: ClassLibraryActionState, formData: FormData) => Promise<ClassLibraryActionState>;

export function ClassLibraryActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-3',
}: {
  action: ClassLibraryServerAction;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CLASS_LIBRARY_ACTION_STATE);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.message && (
        <p
          role="status"
          className={`flex items-center gap-2 text-xs ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
        >
          {state.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <CircleAlert className="h-3.5 w-3.5 shrink-0" />}
          {state.message}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
