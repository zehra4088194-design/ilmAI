'use client';

import { useActionState } from 'react';
import { CircleAlert, Sparkles } from 'lucide-react';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePrincipalSummary } from '@/lib/school-erp/ai-insights';
import { INITIAL_SCHOOL_ACTION_STATE } from '@/lib/school-erp/types';

export function PrincipalAiSummary() {
  const [state, formAction, pending] = useActionState(generatePrincipalSummary, INITIAL_SCHOOL_ACTION_STATE);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Principal AI brief</CardTitle>
        <form action={formAction}>
          <Button type="submit" size="sm" disabled={pending}>
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {pending ? 'Analyzing...' : 'Generate 30-day brief'}
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {!state.message && (
          <p className="text-muted-foreground text-xs">
            Reads the last 30 days of attendance, the current fee position, and the most recent published results, then
            writes what is working, what needs attention, and what to do this week.
          </p>
        )}
        {state.message && !state.success && (
          <p className="text-destructive flex items-center gap-2 text-xs">
            <CircleAlert className="h-3.5 w-3.5" />
            {state.message}
          </p>
        )}
        {state.message && state.success && <AiAnswerRenderer content={state.message} />}
      </CardContent>
    </Card>
  );
}
