'use client';

import { useActionState } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallingSettings } from '@/lib/calling/types';

type ToggleActionState = { success: boolean; message: string };
type ToggleAction = (state: ToggleActionState, formData: FormData) => Promise<ToggleActionState>;

const ROWS: { key: keyof Omit<CallingSettings, 'organization_id'>; label: string; hint: string }[] = [
  {
    key: 'enabled',
    label: 'Enable voice calling',
    hint: 'Master switch for this institution. Owner/admin/coordinators can always call anyone once this is on.',
  },
  {
    key: 'allow_student_student',
    label: 'Students can call each other',
    hint: 'e.g. classmates working together.',
  },
  {
    key: 'allow_student_staff',
    label: 'Students and teachers can call each other',
    hint: 'e.g. a student reaching their class teacher.',
  },
  {
    key: 'allow_parent_staff',
    label: 'Parents and teachers can call each other',
    hint: 'e.g. a parent reaching their child’s teacher.',
  },
];

/**
 * Owner/admin-only calling permission matrix — shared markup for both /school-admin/settings and
 * /college-admin/settings, parameterized by which server action to submit to (the two institution
 * types keep separate action-state types, so a truly shared server action isn't possible, but the
 * form itself is identical).
 */
export function CallingSettingsForm({ action, settings }: { action: ToggleAction; settings: CallingSettings }) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: '' });

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        {ROWS.map((row) => (
          <label key={row.key} className="border-border flex items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              name={row.key}
              defaultChecked={Boolean(settings[row.key])}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">{row.label}</span>
              <span className="text-muted-foreground block text-xs">{row.hint}</span>
            </span>
          </label>
        ))}
      </div>
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
        {pending ? 'Saving...' : 'Save calling settings'}
      </Button>
    </form>
  );
}
