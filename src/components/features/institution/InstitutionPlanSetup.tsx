'use client';

import { useState } from 'react';
import { Building2, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstitutionPlanSetup({
  institutionType,
  organizationId,
  organizationName,
  initialScope,
  initialPlanCode,
  initialFreeAllowance,
  initialCustomPrice,
}: {
  institutionType: 'school' | 'college';
  organizationId: string;
  organizationName: string;
  initialScope: 'management' | 'institution_wide';
  initialPlanCode: string;
  initialFreeAllowance: number;
  initialCustomPrice: number;
}) {
  const [scope, setScope] = useState(initialScope);
  const [planCode, setPlanCode] = useState(['PRO', 'ELITE', 'CUSTOM'].includes(initialPlanCode) ? initialPlanCode : 'PRO');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/institution-plan-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionType, organizationId, scope, planCode }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(json.error || 'Could not save plan.');
      else setMessage('Plan saved. Connected teachers and staff follow the institution plan.');
    } catch {
      setMessage('Could not save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-violet-300">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Institution setup</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold">Set up {organizationName}</h1>
        <p className="mt-2 text-muted-foreground">
          Choose whether the selected student plan is for students too. Your connected teachers and staff always follow the institution plan.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={scope === 'management' ? 'border-violet-500/60' : ''} onClick={() => setScope('management')}>
          <CardHeader><CardTitle>Management system only</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Institution management is enabled. Connected teachers and staff receive the selected institution plan, while students keep their own personal plans.
          </CardContent>
        </Card>
        <Card className={scope === 'institution_wide' ? 'border-violet-500/60' : ''} onClick={() => setScope('institution_wide')}>
          <CardHeader><CardTitle>Management + students</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Connected students also receive the selected institution plan. The first {initialFreeAllowance} student seats are included.
          </CardContent>
        </Card>
      </div>

      {scope === 'institution_wide' && (
        <Card>
          <CardHeader><CardTitle>Choose the student plan</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {(['PRO', 'ELITE', 'CUSTOM'] as const).map((code) => (
              <button
                type="button"
                key={code}
                onClick={() => setPlanCode(code)}
                className={`rounded-xl border p-4 text-left ${planCode === code ? 'border-violet-500 bg-violet-500/10' : 'border-border'}`}
              >
                <div className="font-semibold">{code}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {code === 'CUSTOM'
                    ? `After included seats: $${initialCustomPrice.toFixed(2)} / student`
                    : `First ${initialFreeAllowance} student seats included`}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Users className="h-4 w-4 text-violet-300" />
          Student allowance
        </div>
        <p className="mt-1 text-muted-foreground">
          Students within the configured allowance can be added. For Pro/Elite, once that allowance is reached, the principal must upgrade/change the student plan before adding more students.
          Custom uses the configured per-student price after the included allowance.
        </p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save institution plan'}
        <Check className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
