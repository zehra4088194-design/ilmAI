'use client';

import { useState } from 'react';
import { Bot, BookOpenCheck, DollarSign, GraduationCap, Mail, Moon, Presentation, Save, ShieldCheck, Sun, UserRoundCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { normalizePlatformSettings, type PlatformSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

const TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ELITE'];

const ACCESS_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['access'], string]> = [
  ['pastPapers', 'Past papers access'],
  ['downloadPDF', 'PDF downloads'],
  ['studentChat', 'Student chat'],
  ['liveVoice', 'Live Voice'],
  ['games', 'Live games'],
  ['restPlaylists', 'Rest playlists'],
  ['parentDashboard', 'Parent dashboard'],
  ['advancedParentAnalytics', 'Advanced parent analytics'],
  ['parentReports', 'Weekly parent reports'],
  ['prioritySupport', 'Priority support'],
  ['adsFree', 'Hide ads'],
];

const LIMIT_LABELS: Array<[keyof PlatformSettings['subscriptionPlans']['FREE']['limits'], string]> = [
  ['aiLifetimeDemoCredits', 'Lifetime AI demos'],
  ['aiCreditsWeekly', 'Shared AI/week (Free)'],
  ['aiCreditsDaily', 'Shared AI/day'],
  ['aiCreditsMonthly', 'Shared AI/month'],
  ['premiumAiMonthly', 'Premium AI/month'],
  ['quizDaily', 'Testing/day'],
  ['universityHubWeekly', 'University Hub/week'],
  ['liveVoiceDaily', 'Live voice/day'],
  ['flashcardsTotal', 'Flashcards total'],
  ['gameMinutesDaily', 'Game minutes/day'],
  ['parentGuardiansMax', 'Max guardians'],
  ['parentAttachmentFilesMonthly', 'Parent files/month'],
  ['parentAttachmentMegabytesMonthly', 'Parent MB/month'],
];

const AUDIENCE_LIMIT_LABELS: Array<
  [keyof PlatformSettings['subscriptionPlans']['FREE']['audienceLimits']['school'], string]
> = [
  ['presentationsMonthly', 'Presentations/month'],
  ['presentationSlidesMax', 'Slides/presentation'],
  ['fileSummariesMonthly', 'File summaries/month'],
  ['fileTestsMonthly', 'File tests/month'],
];

const PROVIDER_BUDGET_LABELS: Array<[keyof PlatformSettings['providerDailyBudgets'], string]> = [
  ['groqFast', 'Groq fast/day'],
  ['groqLarge', 'Groq large/day'],
  ['gemini', 'Gemini/day'],
  ['deepseek', 'DeepSeek direct/day'],
  ['ocrSpace', 'OCR.space/day'],
  ['openRouter', 'OpenRouter/day'],
  ['grok', 'Grok/day'],
  ['claude', 'Claude/day'],
  ['gpt', 'GPT/day'],
];

const AI_ROUTING_LABELS: Array<[keyof PlatformSettings['aiRouting'], string]> = [
  ['sideChat', 'Side chat'],
  ['aiTutor', 'AI Tutor'],
  ['studyTools', 'General study tools'],
  ['grading', 'Answer checking / grading'],
  ['resourceTest', 'PDF/resource tests'],
  ['resourceSummary', 'PDF/resource summaries'],
  ['presentation', 'Presentation builder'],
  ['visionOcr', 'Vision / handwritten OCR'],
  ['studentChatModeration', 'Student chat safety check'],
];

const AI_PROVIDER_OPTIONS: Array<{ value: PlatformSettings['aiRouting'][keyof PlatformSettings['aiRouting']]; label: string }> = [
  { value: 'advanced', label: 'OpenRouter (free auto-router â†’ DeepSeek fallback)' },
  { value: 'groq', label: 'Groq / Assistant' },
  { value: 'gemini', label: 'Gemini Flash-Lite' },
  { value: 'deepseek', label: 'DeepSeek (direct)' },
  { value: 'local', label: 'Local Llama' },
  { value: 'grok', label: 'Grok' },
  { value: 'claude', label: 'Claude' },
  { value: 'gpt', label: 'ChatGPT / GPT' },
];

export function PlatformSettingsForm({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [settings, setSettings] = useState(() => normalizePlatformSettings(initialSettings));
  const [saving, setSaving] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  // Recomputes PKR from USD * rate for every tier EXCEPT ones the admin has
  // hardcoded (plan.pkrManual) â€” those keep whatever PKR value was typed in,
  // untouched by rate changes/refreshes, same rule normalizePlatformSettings
  // enforces server-side.
  const withConvertedPkrPrices = (current: PlatformSettings, usdToPkr = current.exchangeRate.usdToPkr) => ({
    ...current,
    subscriptionPlans: Object.fromEntries(
      TIERS.map((tier) => {
        const plan = current.subscriptionPlans[tier];
        if (plan.pkrManual) return [tier, plan];
        return [
          tier,
          {
            ...plan,
            price: {
              ...plan.price,
              PKR: {
                monthly: Math.round(plan.price.USD.monthly * usdToPkr),
                annual: Math.round(plan.price.USD.annual * usdToPkr),
              },
            },
          },
        ];
      })
    ) as PlatformSettings['subscriptionPlans'],
  });

  const updatePlan = (
    tier: SubscriptionTier,
    updater: (
      plan: PlatformSettings['subscriptionPlans'][SubscriptionTier]
    ) => PlatformSettings['subscriptionPlans'][SubscriptionTier]
  ) => {
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
      if (!res.ok) throw new Error(json.error || 'Settings could not be saved.');
      setSettings(normalizePlatformSettings(json.settings));
      toast.success('Platform settings saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settings could not be saved.');
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
            <p className="text-muted-foreground mt-1 text-sm">
              Change Free, Pro, and Elite prices, daily/weekly usage limits, downloads, and feature toggles here.
            </p>
          </div>
          <Button variant="gradient" onClick={save} loading={saving} className="shrink-0">
            <Save className="h-4 w-4" /> Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardHeader>
          <CardTitle>Free Provider Safety Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            These are shared platform-wide daily caps, not per-user limits. 0 disables a provider. Increase a limit only
            after checking the provider dashboard&apos;s actual quota.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVIDER_BUDGET_LABELS.map(([key, label]) => (
              <NumberField
                key={key}
                label={label}
                value={settings.providerDailyBudgets[key]}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    providerDailyBudgets: {
                      ...current.providerDailyBudgets,
                      [key]: Math.max(0, value),
                    },
                  }))
                }
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Defaults are conservative beta caps. Claude/GPT do not have dependable permanent free API tiers, so both are
            0. The Grok cap is for available promotional credits only.
          </p>
        </CardContent>
      </Card>

      <Card className="border-fuchsia-500/25 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-fuchsia-400" />
            AI routing by module
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            These server-side choices override the user dropdown. If a user selects Claude/ChatGPT/Gemini but this
            module is set to DeepSeek, the request will still go to DeepSeek.
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {AI_ROUTING_LABELS.map(([key, label]) => (
              <label key={key} className="text-muted-foreground space-y-1 text-xs font-medium">
                <span>{label}</span>
                <select
                  value={settings.aiRouting[key]}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      aiRouting: { ...current.aiRouting, [key]: event.target.value as PlatformSettings['aiRouting'][typeof key] },
                    }))
                  }
                  className="border-input bg-background text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  {AI_PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            USD to PKR rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Set plan prices in USD below. Auto: the daily cron (and this page's refresh button) keep the rate below in
            sync with the live API. Hardcode: your typed rate is used exactly as-is and never overwritten — the fetched
            rate still shows below for reference, it just doesn&apos;t apply automatically.
          </p>

          <div className="border-border bg-background inline-flex items-center gap-1 rounded-full border p-1">
            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, exchangeRate: { ...current.exchangeRate, mode: 'auto' } }))}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                settings.exchangeRate.mode === 'auto' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, exchangeRate: { ...current.exchangeRate, mode: 'manual' } }))}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                settings.exchangeRate.mode === 'manual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              Hardcode
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label={settings.exchangeRate.mode === 'manual' ? 'USD = PKR (your rate)' : 'USD = PKR'}
              value={settings.exchangeRate.usdToPkr}
              disabled={settings.exchangeRate.mode !== 'manual'}
              onChange={(value) =>
                setSettings((current) => {
                  const usdToPkr = Math.max(1, value);
                  return withConvertedPkrPrices(
                    {
                      ...current,
                      exchangeRate: { ...current.exchangeRate, usdToPkr },
                    },
                    usdToPkr
                  );
                })
              }
            />
            <div className="text-muted-foreground rounded-lg border p-3 text-xs">
              <p className="font-semibold text-foreground">Fetched rate (API)</p>
              <p>{settings.exchangeRate.fetchedRate ?? 'Not fetched yet'}</p>
              <p className="mt-1">
                {settings.exchangeRate.fetchedAt ? new Date(settings.exchangeRate.fetchedAt).toLocaleString() : 'Not fetched yet'}
              </p>
            </div>
            <div className="text-muted-foreground rounded-lg border p-3 text-xs">
              <p className="font-semibold text-foreground">Provider timestamp</p>
              <p>{settings.exchangeRate.lastUpdated || 'Not available'}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshingRate}
            onClick={async () => {
              setIsRefreshingRate(true);
              try {
                const res = await fetch('/api/admin/settings/refresh-exchange-rate', { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Refresh failed.');
                setSettings((current) => withConvertedPkrPrices(
                  { ...current, exchangeRate: { ...current.exchangeRate, ...data } },
                  data.rate
                ));
                toast.success(
                  data.mode === 'manual'
                    ? `Fetched 1 USD = ${data.fetchedRate} PKR — your hardcoded rate (${data.rate}) still applies.`
                    : `Rate updated: 1 USD = ${data.rate} PKR`
                );
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Could not refresh rate.');
              } finally {
                setIsRefreshingRate(false);
              }
            }}
          >
            {isRefreshingRate ? 'Refreshingâ€¦' : 'Refresh rate now'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-fuchsia-500/25 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-fuchsia-500" />
            Parent plans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            A parent account&apos;s own plan â€” separate from any child&apos;s subscription. Caps how many children a
            parent can link and whether they see the full analytics dashboard.
          </p>
          <NumberField
            label="Free plan: children a parent can link at no cost"
            value={settings.parentPlans.freeChildrenMax}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                parentPlans: { ...current.parentPlans, freeChildrenMax: Math.max(0, value) },
              }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Paid plan $/month"
              value={settings.parentPlans.paid.priceUsdMonthly}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, paid: { ...current.parentPlans.paid, priceUsdMonthly: Math.max(0, value) } },
                }))
              }
            />
            <NumberField
              label="Paid plan: children max"
              value={settings.parentPlans.paid.childrenMax ?? 0}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: {
                    ...current.parentPlans,
                    paid: { ...current.parentPlans.paid, childrenMax: value <= 0 ? null : Math.round(value) },
                  },
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Elite plan $/month"
              value={settings.parentPlans.elite.priceUsdMonthly}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, elite: { ...current.parentPlans.elite, priceUsdMonthly: Math.max(0, value) } },
                }))
              }
            />
            <NumberField
              label="Elite plan: children max (0 = unlimited)"
              value={settings.parentPlans.elite.childrenMax ?? 0}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: {
                    ...current.parentPlans,
                    elite: { ...current.parentPlans.elite, childrenMax: value <= 0 ? null : Math.round(value) },
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-lime-500/25 bg-lime-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-lime-500" />
            Institution pricing (schools &amp; colleges)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            One base monthly USD price per institution type. Annual and volume-tier prices are always computed
            from this + the discount percentages below â€” never entered by hand on the checkout screen.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="School base $/month"
              value={settings.institutionPricing.school.monthlyUsd}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  institutionPricing: { ...current.institutionPricing, school: { monthlyUsd: Math.max(0, value) } },
                }))
              }
            />
            <NumberField
              label="College base $/month"
              value={settings.institutionPricing.college.monthlyUsd}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  institutionPricing: { ...current.institutionPricing, college: { monthlyUsd: Math.max(0, value) } },
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Annual discount %"
              value={settings.institutionPricing.annualDiscountPercent}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  institutionPricing: { ...current.institutionPricing, annualDiscountPercent: Math.min(100, Math.max(0, value)) },
                }))
              }
            />
            <NumberField
              label="Volume discount %"
              value={settings.institutionPricing.volumeDiscountPercent}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  institutionPricing: { ...current.institutionPricing, volumeDiscountPercent: Math.min(100, Math.max(0, value)) },
                }))
              }
            />
            <NumberField
              label="Min students for volume discount"
              value={settings.institutionPricing.volumeDiscountMinStudents}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  institutionPricing: { ...current.institutionPricing, volumeDiscountMinStudents: Math.max(0, value) },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-500/25 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-cyan-400" />
            PDF display theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            This changes only Library, Past Paper, and College PDF versions. It does not change the app theme selected
            by the user.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                {
                  value: 'follow-user',
                  label: 'Follow user theme',
                  description: 'Light app theme opens the light PDF; dark app theme opens the dark PDF.',
                  icon: UserRoundCog,
                },
                {
                  value: 'dark',
                  label: 'Always dark PDF',
                  description: 'Prefer the dark PDF for every user and app theme.',
                  icon: Moon,
                },
                {
                  value: 'light',
                  label: 'Always light PDF',
                  description: 'Prefer the light/default PDF for every user and app theme.',
                  icon: Sun,
                },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const selected = settings.pdfThemeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSettings((current) => ({ ...current, pdfThemeMode: option.value }))}
                  className={
                    selected
                      ? 'border-primary bg-primary/10 ring-primary/20 rounded-xl border p-4 text-left ring-2'
                      : 'border-border bg-card/60 hover:border-primary/40 rounded-xl border p-4 text-left transition-colors'
                  }
                >
                  <Icon className={selected ? 'text-primary mb-3 h-5 w-5' : 'text-muted-foreground mb-3 h-5 w-5'} />
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">{option.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Daily study emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            aria-pressed={settings.dailyStudyEmailsEnabled}
            onClick={() =>
              setSettings((current) => ({ ...current, dailyStudyEmailsEnabled: !current.dailyStudyEmailsEnabled }))
            }
            className={
              settings.dailyStudyEmailsEnabled
                ? 'border-primary bg-primary/10 ring-primary/20 flex w-full items-center justify-between rounded-xl border p-4 text-left ring-2'
                : 'border-border bg-card/60 hover:border-primary/40 flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors'
            }
          >
            <span>
              <span className="text-sm font-semibold">
                {settings.dailyStudyEmailsEnabled ? 'Enabled â€” sending every morning' : 'Disabled â€” not sending'}
              </span>
              <span className="text-muted-foreground mt-1 block text-xs leading-5">
                Controls the daily-morning AI study email cron for every user who opted in. Off by default â€” no
                emails go out until this is switched on here. Doesn&apos;t affect the accompanying in-app
                notification, which always goes out regardless of this setting (per-user notification
                preferences still apply).
              </span>
            </span>
            <Badge variant={settings.dailyStudyEmailsEnabled ? 'default' : 'outline'}>
              {settings.dailyStudyEmailsEnabled ? 'On' : 'Off'}
            </Badge>
          </button>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {TIERS.map((tier) => {
          const plan = settings.subscriptionPlans[tier];
          return (
            <Card
              key={tier}
              className={tier === 'ELITE' ? 'border-amber-500/35' : tier === 'PRO' ? 'border-violet-500/35' : undefined}
            >
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
                  <Input
                    value={plan.name}
                    onChange={(event) => updatePlan(tier, (item) => ({ ...item, name: event.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="USD/month"
                    value={plan.price.USD.monthly}
                    onChange={(value) =>
                      updatePlan(tier, (item) => {
                        const nextUsd = { ...item.price.USD, monthly: value };
                        return {
                          ...item,
                          price: {
                            ...item.price,
                            USD: nextUsd,
                            PKR: {
                              monthly: Math.round(nextUsd.monthly * settings.exchangeRate.usdToPkr),
                              annual: Math.round(nextUsd.annual * settings.exchangeRate.usdToPkr),
                            },
                          },
                        };
                      })
                    }
                  />
                  <NumberField
                    label="USD/year"
                    value={plan.price.USD.annual}
                    onChange={(value) =>
                      updatePlan(tier, (item) => {
                        const nextUsd = { ...item.price.USD, annual: value };
                        return {
                          ...item,
                          price: {
                            ...item.price,
                            USD: nextUsd,
                            PKR: {
                              monthly: Math.round(nextUsd.monthly * settings.exchangeRate.usdToPkr),
                              annual: Math.round(nextUsd.annual * settings.exchangeRate.usdToPkr),
                            },
                          },
                        };
                      })
                    }
                  />
                  {/* Read-only — computed as USD x the USD/PKR rate set in the "USD to PKR rate"
                      card below (which has its own Auto/Hardcode switch for the rate itself). */}
                  <NumberField label="PKR/month (auto)" value={plan.price.PKR.monthly} onChange={() => {}} disabled />
                  <NumberField label="PKR/year (auto)" value={plan.price.PKR.annual} onChange={() => {}} disabled />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Usage limits</p>
                  <div className="grid grid-cols-2 gap-3">
                    {LIMIT_LABELS.map(([key, label]) => (
                      <NumberField
                        key={key}
                        label={label}
                        value={plan.limits[key]}
                        onChange={(value) =>
                          updatePlan(tier, (item) => ({ ...item, limits: { ...item.limits, [key]: value } }))
                        }
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    In the Usage field, -1 means unlimited. AI credits use a shared pool rather than separate per-tool
                    pools.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Audience-specific value</p>
                  {(['school', 'college', 'university'] as const).map((audience) => (
                    <div key={audience} className="bg-muted/20 space-y-2 rounded-xl border p-3">
                      <p className="text-xs font-bold capitalize">{audience}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {AUDIENCE_LIMIT_LABELS.map(([key, label]) => (
                          <NumberField
                            key={key}
                            label={label}
                            value={plan.audienceLimits[audience][key]}
                            onChange={(value) =>
                              updatePlan(tier, (item) => ({
                                ...item,
                                audienceLimits: {
                                  ...item.audienceLimits,
                                  [audience]: { ...item.audienceLimits[audience], [key]: value },
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Access toggles</p>
                  <div className="grid gap-2">
                    {ACCESS_LABELS.map(([key, label]) => (
                      <label key={key} className="bg-muted/20 flex items-center gap-2 rounded-lg border p-2 text-sm">
                        <Checkbox
                          checked={plan.access[key]}
                          onCheckedChange={(checked) =>
                            updatePlan(tier, (item) => ({
                              ...item,
                              access: { ...item.access, [key]: checked === true },
                            }))
                          }
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
                    onChange={(event) =>
                      updatePlan(tier, (item) => ({
                        ...item,
                        features: event.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean),
                      }))
                    }
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Parent Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-400" />
            Parent Plans
          </CardTitle>
          <CardDescription>Manage parent subscription pricing (child linking limits)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NumberField
            label="Free tier - max children"
            value={settings.parentPlans.freeChildrenMax}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                parentPlans: { ...current.parentPlans, freeChildrenMax: Math.max(0, value) },
              }))
            }
          />
          <div className="space-y-4">
            <h4 className="font-semibold">Paid Tier</h4>
            <NumberField
              label="Monthly price (USD)"
              value={settings.parentPlans.paid.priceUsdMonthly}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, paid: { ...current.parentPlans.paid, priceUsdMonthly: Math.max(0, value) } },
                }))
              }
            />
            <NumberField
              label="Max children (null = unlimited)"
              value={settings.parentPlans.paid.childrenMax ?? -1}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, paid: { ...current.parentPlans.paid, childrenMax: value < 0 ? null : value } },
                }))
              }
            />
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Elite Tier</h4>
            <NumberField
              label="Monthly price (USD)"
              value={settings.parentPlans.elite.priceUsdMonthly}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, elite: { ...current.parentPlans.elite, priceUsdMonthly: Math.max(0, value) } },
                }))
              }
            />
            <NumberField
              label="Max children (null = unlimited)"
              value={settings.parentPlans.elite.childrenMax ?? -1}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  parentPlans: { ...current.parentPlans, elite: { ...current.parentPlans.elite, childrenMax: value < 0 ? null : value } },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* University Student Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-400" />
            University Student Plans
          </CardTitle>
          <CardDescription>Manage university student AI credits and pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['free', 'paid', 'elite'].map((tier) => (
            <div key={tier} className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
              <h4 className="font-semibold capitalize">{tier} Tier</h4>
              <NumberField
                label="Monthly price (USD)"
                value={settings.universityPlans[tier].priceUsdMonthly}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    universityPlans: {
                      ...current.universityPlans,
                      [tier]: { ...current.universityPlans[tier], priceUsdMonthly: Math.max(0, value) },
                    },
                  }))
                }
              />
              <NumberField
                label="AI credits/month"
                value={settings.universityPlans[tier].aiCreditsMonthly}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    universityPlans: {
                      ...current.universityPlans,
                      [tier]: { ...current.universityPlans[tier], aiCreditsMonthly: Math.max(0, value) },
                    },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Teacher Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-green-400" />
            Teacher Plans
          </CardTitle>
          <CardDescription>Manage institutional teacher classroom limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['free', 'paid', 'elite'].map((tier) => (
            <div key={tier} className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
              <h4 className="font-semibold capitalize">{tier} Tier</h4>
              <NumberField
                label="Monthly price (USD)"
                value={settings.teacherPlans[tier].priceUsdMonthly}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    teacherPlans: {
                      ...current.teacherPlans,
                      [tier]: { ...current.teacherPlans[tier], priceUsdMonthly: Math.max(0, value) },
                    },
                  }))
                }
              />
              <NumberField
                label="Max classrooms (null = unlimited)"
                value={settings.teacherPlans[tier].classroomsMax ?? -1}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    teacherPlans: {
                      ...current.teacherPlans,
                      [tier]: { ...current.teacherPlans[tier], classroomsMax: value < 0 ? null : value },
                    },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-muted-foreground flex items-start gap-3 p-5 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p>
            Changes will apply to new requests as soon as settings are saved. Redis daily and weekly counters will use
            the current window count until the next refresh.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-muted-foreground space-y-1 text-xs font-medium">
      <span>{label}</span>
      <Input
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}


