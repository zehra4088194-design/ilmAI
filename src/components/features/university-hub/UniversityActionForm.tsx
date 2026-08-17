'use client';

// Mirrors src/components/features/school-erp/SchoolActionForm.tsx / college's
// CollegeActionForm.tsx — same pattern, third copy since University Hub is its own
// deliberately-separate module (platform-wide content, not an institution ERP).
import { useActionState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_UNIVERSITY_ACTION_STATE, type UniversityActionState } from '@/lib/university-hub/types';

type UniversityServerAction = (state: UniversityActionState, formData: FormData) => Promise<UniversityActionState>;

export function UniversityActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-3',
}: {
  action: UniversityServerAction;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_UNIVERSITY_ACTION_STATE);
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
