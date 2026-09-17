'use client';

import { useState } from 'react';
import { Building2, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstitutionPlanSetup({
  institutionType, organizationId, organizationName, initialScope, initialPlanCode, initialFreeAllowance, initialCustomPrice,
}: {
  institutionType: 'school' | 'college'; organizationId: string; organizationName: string; initialScope: 'management' | 'institution_wide';
  initialPlanCode: string; initialFreeAllowance: number; initialCustomPrice: number;
}) {
  const [scope, setScope] = useState(initialScope);
  const [planCode, setPlanCode] = useState(['PRO','ELITE','CUSTOM'].includes(initialPlanCode) ? initialPlanCode : 'PRO');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setSaving(true); setMessage('');
    const response = await fetch('/api/institution-plan-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institutionType, organizationId, scope, planCode }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(json.error || 'Could not save plan.');
    else setMessage('Plan saved. Your connected teachers/staff will follow the institution plan.');
    setSaving(false);
  };
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><div className="flex items-center gap-2 text-violet-300"><Building2 className="h-5 w-5" /><span className="text-sm font-semibold">Institution setup</span></div><h1 className="mt-2 text-3xl font-bold">Set up {organizationName}</h1><p className="mt-2 text-muted-foreground">Choose whether your {institutionType} needs management only or the same plan for students and connected staff.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Card className={scope === 'management' ? 'border-violet-500/60' : ''} onClick={() => setScope('management')}><CardHeader><CardTitle>Management system only</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Principal/admin gets the institution management system. Students keep their own account plan.</CardContent></Card>
      <Card className={scope === 'institution_wide' ? 'border-violet-500/60' : ''} onClick={() => setScope('institution_wide')}><CardHeader><CardTitle>Management + students</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Students and connected teachers/staff receive the institution plan. First {initialFreeAllowance} students are included.</CardContent></Card>
    </div>
    {scope === 'institution_wide' && <Card><CardHeader><CardTitle>Choose institution student plan</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{(['PRO','ELITE','CUSTOM'] as const).map((code) => <button type="button" key={code} onClick={() => setPlanCode(code)} className={`rounded-xl border p-4 text-left ${planCode === code ? 'border-violet-500 bg-violet-500/10' : 'border-border'}`}><div className="font-semibold">{code}</div><div className="mt-1 text-xs text-muted-foreground">{code === 'CUSTOM' ? `student / $${initialCustomPrice.toFixed(2)}` : `First ${initialFreeAllowance} students included`}</div></button>)}</CardContent></Card>}
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm"><div className="flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-violet-300" />Student allowance</div><p className="mt-1 text-muted-foreground">Student #1–{initialFreeAllowance} are included. Adding the next student requires an eligible upgrade/paid allowance.</p></div>
    {message && <p className="text-sm text-muted-foreground">{message}</p>}
    <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save institution plan'}<Check className="ml-2 h-4 w-4" /></Button>
  </div>;
}
