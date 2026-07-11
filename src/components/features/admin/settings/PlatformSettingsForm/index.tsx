'use client';

import { useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { normalizePlatformSettings, type PlatformSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';
import { toast } from 'sonner';

const TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ELITE'];

const ACCESS_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['access'], string]> = [
  ['pastPapers', 'Past papers access'],
  ['downloadPDF', 'PDF downloads'],
  ['studentChat', 'Student chat'],
  ['liveVoice', 'Live Voice'],
  ['prioritySupport', 'Priority support'],
  ['adsFree', 'Hide ads'],
];

const LIMIT_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['limits'], string]> = [
  ['aiSideChatDaily', 'Side chat/day'],
  ['aiToolDaily', 'AI tools/day'],
  ['quizDaily', 'Testing/day'],
  ['ocrDaily', 'OCR scans/day'],
  ['liveVoiceDaily', 'Live voice/day'],
  ['flashcardsTotal', 'Flashcards total'],
];

export function PlatformSettingsForm({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [settings, setSettings] = useState(() => normalizePlatformSettings(initialSettings));
  const [saving, setSaving] = useState(false);

  const updatePlan = (tier: SubscriptionTier, updater: (plan: PlatformSettings['subscriptionPlans'][SubscriptionTier]) => PlatformSettings['subscriptionPlans'][SubscriptionTier]) => {
    setSettings((current) => ({
      ...current,
      subscriptionPlans: {
        ...current.subscriptionPlans,
        [tier]: updater(current.subscriptionPlans[tier]),
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Settings save nahi hui');
      setSettings(normalizePlatformSettings(json.settings));
      toast.success('Platform settings save ho gayi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settings save nahi hui');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-violet-500/25 bg-violet-500/10">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-2 bg-violet-600">Admin controlled</Badge>
            <h2 className="text-xl font-bold">Subscription Plans & Feature Limits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Yahan se Free, Pro aur Elite ki monthly/yearly price, AI daily limits, downloads aur feature toggles change karo.
            </p>
          </div>
          <Button variant="gradient" onClick={save} loading={saving} className="shrink-0">
            <Save className="h-4 w-4" /> Save settings
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {TIERS.map((tier) => {
          const plan = settings.subscriptionPlans[tier];
          return (
            <Card key={tier} className={tier === 'ELITE' ? 'border-amber-500/35' : tier === 'PRO' ? 'border-violet-500/35' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{plan.name}</span>
                  <Badge variant={tier === 'FREE' ? 'outline' : 'default'}>{tier}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={plan.enabled}
                    onCheckedChange={(checked) => updatePlan(tier, (item) => ({ ...item, enabled: checked === true }))}
                  />
                  Plan visible/enabled
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Name</p>
                  <Input value={plan.name} onChange={(event) => updatePlan(tier, (item) => ({ ...item, name: event.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="PKR/month" value={plan.price.PKR.monthly} onChange={(value) => updatePlan(tier, (item) => ({ ...item, price: { ...item.price, PKR: { ...item.price.PKR, monthly: value } } }))} />
                  <NumberField label="PKR/year" value={plan.price.PKR.annual} onChange={(value) => updatePlan(tier, (item) => ({ ...item, price: { ...item.price, PKR: { ...item.price.PKR, annual: value } } }))} />
                  <NumberField label="INR/month" value={plan.price.INR.monthly} onChange={(value) => updatePlan(tier, (item) => ({ ...item, price: { ...item.price, INR: { ...item.price.INR, monthly: value } } }))} />
                  <NumberField label="INR/year" value={plan.price.INR.annual} onChange={(value) => updatePlan(tier, (item) => ({ ...item, price: { ...item.price, INR: { ...item.price.INR, annual: value } } }))} />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Daily limits</p>
                  <div className="grid grid-cols-2 gap-3">
                    {LIMIT_LABELS.map(([key, label]) => (
                      <NumberField
                        key={key}
                        label={label}
                        value={plan.limits[key]}
                        onChange={(value) => updatePlan(tier, (item) => ({ ...item, limits: { ...item.limits, [key]: value } }))}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Flashcards total me -1 ka matlab unlimited.</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Access toggles</p>
                  <div className="grid gap-2">
                    {ACCESS_LABELS.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2 text-sm">
                        <Checkbox
                          checked={plan.access[key]}
                          onCheckedChange={(checked) => updatePlan(tier, (item) => ({ ...item, access: { ...item.access, [key]: checked === true } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Feature bullets</p>
                  <Textarea
                    value={plan.features.join('\n')}
                    onChange={(event) => updatePlan(tier, (item) => ({ ...item, features: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }))}
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p>
            Settings save hote hi new requests par apply hongi. Redis daily counters existing day ke liye apni current count rakhenge, lekin limit value next call se updated use hogi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
