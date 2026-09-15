const fs = require('fs');
const path = require('path');

const settingsPath = path.join('src', 'components', 'features', 'admin', 'settings', 'PlatformSettingsForm', 'index.tsx');
let s = fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, '');

s = s.replace(
  "import { Bot, BookOpenCheck, DollarSign, GraduationCap, Mail, Moon, Presentation, Printer, Save, ShieldCheck, Sun, UserRoundCog, Users } from 'lucide-react';",
  "import { BookOpenCheck, DollarSign, GraduationCap, Mail, Moon, Presentation, Printer, Save, ShieldCheck, Sun, UserRoundCog, Users } from 'lucide-react';"
);

s = s.replace(/\nconst PROVIDER_BUDGET_LABELS:[\s\S]*?\nconst AI_PROVIDER_OPTIONS:[\s\S]*?\n\];\n/, '\n');

const providerCard = /\n      <Card className="border-amber-500\/25 bg-amber-500\/5">[\s\S]*?\n      <\/Card>\n/;
const routingCard = /\n      <Card className="border-fuchsia-500\/25 bg-fuchsia-500\/5">\n        <CardHeader>\n          <CardTitle className="flex items-center gap-2">\n            <Bot className="h-5 w-5 text-fuchsia-400" \/>\n            AI routing by module\n          <\/CardTitle>\n        <\/CardHeader>[\s\S]*?\n      <\/Card>\n/;

const before = s;
s = s.replace(providerCard, '\n');
s = s.replace(routingCard, '\n');
if (s === before) throw new Error('AI cards were not found in PlatformSettingsForm');
if (s.includes('Free Provider Safety Budgets') || s.includes('AI routing by module')) throw new Error('AI cards still remain in PlatformSettingsForm');
fs.writeFileSync(settingsPath, s);

const aiPath = path.join('src', 'app', '(admin)', 'admin', 'ai-api-keys', 'page.tsx');
let a = fs.readFileSync(aiPath, 'utf8').replace(/^\uFEFF/, '');

if (!a.includes("from '@/lib/platform-settings/shared'")) {
  a = a.replace(
    "} from '@/lib/ai/runtime-settings';",
    "} from '@/lib/ai/runtime-settings';\nimport { normalizePlatformSettings, type PlatformSettings } from '@/lib/platform-settings/shared';"
  );
}

const marker = "\nconst KEY_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);\n";
if (!a.includes('const PROVIDER_BUDGET_LABELS')) {
  const constants = `
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
`;
  if (!a.includes(marker)) throw new Error('AI page marker not found');
  a = a.replace(marker, marker + constants, 1);
}

a = a.replace(
  "  const [settings, setSettings] = useState<AiRuntimeSettings>(DEFAULT_AI_RUNTIME_SETTINGS);\n  const [loading, setLoading] = useState(true);\n  const [saving, setSaving] = useState(false);",
  "  const [settings, setSettings] = useState<AiRuntimeSettings>(DEFAULT_AI_RUNTIME_SETTINGS);\n  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);\n  const [loading, setLoading] = useState(true);\n  const [saving, setSaving] = useState(false);"
);

const oldEffect = `  useEffect(() => {
    fetch('/api/admin/ai-runtime-settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load AI settings.');
        setSettings(data.settings);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load AI settings.'))
      .finally(() => setLoading(false));
  }, []);
`;
const newEffect = `  useEffect(() => {
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
`;
if (a.includes(oldEffect)) a = a.replace(oldEffect, newEffect);

const oldSave = `  const save = async () => {
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
`;
const newSave = `  const save = async () => {
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
`;
if (a.includes(oldSave)) a = a.replace(oldSave, newSave);

const insertBefore = "\n      <Card>\n        <CardContent className=\"p-5 text-sm text-muted-foreground\">";
const cards = `
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
`;
if (!a.includes('AI routing by module') && a.includes(insertBefore)) a = a.replace(insertBefore, cards + insertBefore, 1);
fs.writeFileSync(aiPath, a);
console.log('AI settings cards moved successfully');
