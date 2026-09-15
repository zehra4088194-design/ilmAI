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

const PROVIDERS: Array<{ key: 'groq' | 'gemini' | 'openrouter'; label: string; description: string }> = [
  { key: 'groq', label: 'Groq', description: 'Assistant / fast text generation' },
  { key: 'gemini', label: 'Gemini', description: 'Gemini text + vision / OCR' },
  { key: 'openrouter', label: 'OpenRouter', description: 'Free router + model fallback chain' },
];

const KEY_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

export default function AiApiKeysPage() {
  const [settings, setSettings] = useState<AiRuntimeSettings>(DEFAULT_AI_RUNTIME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/ai-runtime-settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load AI settings.');
        setSettings(data.settings);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load AI settings.'))
      .finally(() => setLoading(false));
  }, []);

  const updateProvider = (provider: 'groq' | 'gemini' | 'openrouter', patch: Partial<AiRuntimeSettings[typeof provider]>) => {
    setSettings((current) => ({ ...current, [provider]: { ...current[provider], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-runtime-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save AI settings.');
      setSettings(data.settings);
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

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">Important:</strong> putting a provider on Fixed #7 means the runtime requires that provider&apos;s #7 secret to exist. It will not silently fall back to #1, which keeps the admin choice strict.
          {loading ? <span className="ml-2">Loading current settings…</span> : null}
        </CardContent>
      </Card>
    </div>
  );
}
