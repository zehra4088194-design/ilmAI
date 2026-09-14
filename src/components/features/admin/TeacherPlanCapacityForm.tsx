'use client';

import { useState } from 'react';
import { Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Tier = 'free' | 'paid' | 'elite';
type Plan = { priceUsdMonthly?: number; classroomsMax?: number | null; studentsMax?: number | null };

export function TeacherPlanCapacityForm({ initialPlans }: { initialPlans: Record<string, Plan> }) {
  const [plans, setPlans] = useState<Record<Tier, Plan>>({
    free: { studentsMax: initialPlans.free?.studentsMax ?? 10, classroomsMax: initialPlans.free?.classroomsMax ?? 1, priceUsdMonthly: initialPlans.free?.priceUsdMonthly ?? 0 },
    paid: { studentsMax: initialPlans.paid?.studentsMax ?? 100, classroomsMax: initialPlans.paid?.classroomsMax ?? 5, priceUsdMonthly: initialPlans.paid?.priceUsdMonthly ?? 2.99 },
    elite: { studentsMax: initialPlans.elite?.studentsMax ?? 500, classroomsMax: initialPlans.elite?.classroomsMax ?? null, priceUsdMonthly: initialPlans.elite?.priceUsdMonthly ?? 6.99 },
  });
  const [saving, setSaving] = useState(false);

  const update = (tier: Tier, key: keyof Plan, value: number | null) =>
    setPlans((current) => ({ ...current, [tier]: { ...current[tier], [key]: value } }));

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/teacher-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Could not save teacher plans.');
      setPlans(json.plans);
      toast.success('Teacher plan limits saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save teacher plans.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-emerald-400">Admin controlled</p><h1 className="text-2xl font-bold">Teacher Plans</h1><p className="text-sm text-muted-foreground">Set the maximum students and classrooms for Free, Pro and Elite teachers.</p></div>
        <Button variant="gradient" onClick={save} loading={saving}><Save className="h-4 w-4" /> Save</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(['free', 'paid', 'elite'] as Tier[]).map((tier) => (
          <Card key={tier}>
            <CardHeader><CardTitle className="capitalize">{tier === 'paid' ? 'Pro' : tier}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1 text-xs font-medium text-muted-foreground block"><span>Monthly price (USD)</span><Input type="number" min="0" step="0.01" value={plans[tier].priceUsdMonthly ?? 0} onChange={(e) => update(tier, 'priceUsdMonthly', Number(e.target.value))} /></label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground block"><span>Max students (-1 = unlimited)</span><Input type="number" min="-1" step="1" value={plans[tier].studentsMax ?? -1} onChange={(e) => update(tier, 'studentsMax', Number(e.target.value) < 0 ? null : Number(e.target.value))} /></label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground block"><span>Max classrooms (-1 = unlimited)</span><Input type="number" min="-1" step="1" value={plans[tier].classroomsMax ?? -1} onChange={(e) => update(tier, 'classroomsMax', Number(e.target.value) < 0 ? null : Number(e.target.value))} /></label>
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground"><Users className="mb-1 h-4 w-4" />Student capacity is enforced when a student joins any class owned by this teacher.</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
