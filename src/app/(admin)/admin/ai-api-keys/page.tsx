'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, KeyRound, RotateCw, Save, MessageCircle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DEFAULT_AI_RUNTIME_SETTINGS,
  type AiKeyMode,
  type AiRuntimeSettings,
} from '@/lib/ai/runtime-settings';
import { normalizePlatformSettings, type PlatformSettings } from '@/lib/platform-settings/shared';

const PROVIDERS: Array<{ key: 'groq' | 'gemini' | 'openrouter'; label: string; description: string }> = [
  { key: 'groq', label: 'Groq', description: 'Assistant / fast text generation' },
  { key: 'gemini', label: 'Gemini', description: 'Gemini text + vision / OCR' },
  { key: 'openrouter', label: 'OpenRouter', description: 'Free router + model fallback chain' },
];

const KEY_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

const PROVIDER_BUDGET_LABELS: Array<[keyof PlatformSettings['providerDailyBudgets'], string]> = [
  ['groqFast', 'Groq fast/day'], ['groqLarge', 'Groq large/day'], ['gemini', 'Gemini/day'],
  ['deepseek', 'DeepSeek direct/day'], ['ocrSpace', 'OCR.space/day'], ['openRouter', 'OpenRouter/day'],
  ['grok', 'Grok/day'], ['claude', 'Claude/day'], ['gpt', 'GPT/day'],
];

const AI_ROUTING_LABELS: Array<[keyof PlatformSettings['aiRouting'], string]> = [
  ['sideChat', 'Side chat'], ['aiTutor', 'AI Tutor'], ['studyTools', 'General study tools'],
  ['grading', 'Answer checking / grading'], ['resourceTest', 'PDF/resource tests'],
  ['resourceSummary', 'PDF/resource summaries'], ['presentation', 'Presentation builder'],
  ['visionOcr', 'Vision / handwritten OCR'], ['studentChatModeration', 'Student chat safety check'],
];

const AI_PROVIDER_OPTIONS: Array<{ value: PlatformSettings['aiRouting'][keyof PlatformSettings['aiRouting']]; label: string }> = [
  { value: 'advanced', label: 'OpenRouter (free auto-router → DeepSeek fallback)' },
  { value: 'groq', label: 'Groq / Assistant' }, { value: 'gemini', label: 'Gemini Flash-Lite' },
  { value: 'deepseek', label: 'DeepSeek (direct)' }, { value: 'local', label: 'Local Llama' },
  { value: 'grok', label: 'Grok' }, { value: 'claude', label: 'Claude' }, { value: 'gpt', label: 'ChatGPT / GPT' },
];

export default function AiApiKeysPage() {
  const [settings, setSettings] = useState<AiRuntimeSettings>(DEFAULT_AI_RUNTIME_SETTINGS);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/ai-runtime-settings').then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load AI settings.');
        return data.settings as AiRuntimeSettings;
      }),
      fetch('/api/admin/platform-settings').then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load platform settings.');
        return normalizePlatformSettings(data.settings) as PlatformSettings;
      }),
    ])
      .then(([runtime, platform]) => { setSettings(runtime); setPlatformSettings(platform); })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load AI settings.'))
      .finally(() => setLoading(false));
  }, []);

  const updateProvider = (provider: 'groq' | 'gemini' | 'openrouter', patch: Partial<AiRuntimeSettings[typeof provider]>) => {
    setSettings((current) => ({ ...current, [provider]: { ...current[provider], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      if (!platformSettings) throw new Error('Platform settings are still loading.');
      const [runtimeResponse, platformResponse] = await Promise.all([
        fetch('/api/admin/ai-runtime-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) }),
        fetch('/api/admin/platform-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: platformSettings }) }),
      ]);
      const runtimeData = await runtimeResponse.json();
      const platformData = await platformResponse.json();
      if (!runtimeResponse.ok) throw new Error(runtimeData.error || 'Could not save AI settings.');
      if (!platformResponse.ok) throw new Error(platformData.error || 'Could not save platform AI settings.');
      setSettings(runtimeData.settings);
      setPlatformSettings(normalizePlatformSettings(platformData.settings));
      toast.success('AI API settings saved. Changes apply to new AI requests.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI API Keys & Runtime</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control which key each provider uses. Rotation is the default; Fixed uses exactly the selected key.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/admin/settings">Platform Settings</Link></Button>
          <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save</Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Secret safety</CardTitle>
          <CardDescription>
            API keys stay in Coolify environment secrets. This page stores only the selection policy and never the actual key values.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {PROVIDERS.map(({ key, label, description }) => {
          const value = settings[key];
          const mode = value.mode as AiKeyMode;
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> {label}</CardTitle>
                  <Badge variant={mode === 'rotation' ? 'default' : 'outline'}>
                    {mode === 'rotation' ? 'Rotation' : `Fixed #${value.keyNumber}`}
                  </Badge>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={mode === 'rotation' ? 'gradient' : 'outline'}
                    onClick={() => updateProvider(key, { mode: 'rotation' })}
                  >
                    <RotateCw className="h-4 w-4" /> Rotation
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'fixed' ? 'gradient' : 'outline'}
                    onClick={() => updateProvider(key, { mode: 'fixed' })}
                  >
                    Fixed key
                  </Button>
                </div>

                <label className="block text-sm font-medium">
                  Key number
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={value.keyNumber}
                    disabled={mode !== 'fixed'}
                    onChange={(event) => updateProvider(key, { keyNumber: Number(event.target.value) })}
                  >
                    {KEY_OPTIONS.map((number) => <option key={number} value={number}>Key #{number}</option>)}
                  </select>
                </label>

                <p className="text-xs text-muted-foreground">
                  {mode === 'rotation'
                    ? 'Uses the provider pool in round-robin order. Failed requests can continue through the next keys.'
                    : `Only key #${value.keyNumber} is allowed. It will not silently switch to another key if it fails.`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-fuchsia-500/20 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp AI bot</CardTitle>
          <CardDescription>
            The WhatsApp worker calls the app&apos;s AI endpoint, so this provider/model choice applies to the bot without putting provider secrets in the worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Provider
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={settings.whatsapp.provider}
              onChange={(event) => setSettings((current) => ({ ...current, whatsapp: { ...current.whatsapp, provider: event.target.value as AiRuntimeSettings['whatsapp']['provider'] } }))}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Model tier
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={settings.whatsapp.tier}
              onChange={(event) => setSettings((current) => ({ ...current, whatsapp: { ...current.whatsapp, tier: event.target.value as AiRuntimeSettings['whatsapp']['tier'] } }))}
            >
              <option value="mini">Mini / fastest</option>
              <option value="medium">Medium</option>
              <option value="pro">Pro / strongest</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {platformSettings ? (
        <>
          <Card className="border-amber-500/25 bg-amber-500/5">
            <CardHeader>
              <CardTitle>Free Provider Safety Budgets</CardTitle>
              <CardDescription>Shared platform-wide daily caps for providers. 0 disables a provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PROVIDER_BUDGET_LABELS.map(([key, label]) => (
                  <label key={key} className="text-sm font-medium">{label}
                    <input type="number" min={0} value={platformSettings.providerDailyBudgets[key]}
                      onChange={(event) => setPlatformSettings((current) => current ? ({
                        ...current,
                        providerDailyBudgets: { ...current.providerDailyBudgets, [key]: Math.max(0, Number(event.target.value) || 0) },
                      }) : current)}
                      className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Defaults are conservative beta caps. Raise them only after checking the provider dashboard&apos;s actual quota.</p>
            </CardContent>
          </Card>

          <Card className="border-fuchsia-500/25 bg-fuchsia-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI routing by module</CardTitle>
              <CardDescription>Server-side provider choices override user model dropdowns for each module.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {AI_ROUTING_LABELS.map(([key, label]) => (
                  <label key={key} className="text-sm font-medium"><span className="text-muted-foreground text-xs">{label}</span>
                    <select value={platformSettings.aiRouting[key]}
                      onChange={(event) => setPlatformSettings((current) => current ? ({
                        ...current,
                        aiRouting: { ...current.aiRouting, [key]: event.target.value as PlatformSettings['aiRouting'][typeof key] },
                      }) : current)}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                      {AI_PROVIDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">Important:</strong> putting a provider on Fixed #7 means the runtime requires that provider&apos;s #7 secret to exist. It will not silently fall back to #1, which keeps the admin choice strict.
          {loading ? <span className="ml-2">Loading current settings…</span> : null}
        </CardContent>
      </Card>
    </div>
  );
}
