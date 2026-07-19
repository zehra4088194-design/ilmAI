'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Printer,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Volume2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { printElementById } from '@/lib/utils/printElement';
import { cn } from '@/lib/utils/cn';

type PharmaMode = 'student' | 'patient';

type DrugInfo = {
  medicine_name?: string;
  aliases?: string[];
  drug_class?: string;
  overview?: { summary?: string; key_points?: string[] };
  therapeutic_uses?: string[];
  adverse_reactions?: { common?: string[]; serious?: string[]; seek_medical_help_when?: string[] };
  contraindications?: { absolute?: string[]; cautions?: string[] };
  mechanism_of_action?: string;
  pharmacokinetics_pharmacodynamics?: Record<string, string>;
  adult_dosing?: string[];
  pediatric_dosing?: string[];
  drug_interactions?: { major?: string[]; moderate?: string[]; administration_notes?: string[] };
  pregnancy_lactation?: { pregnancy?: string; lactation?: string };
  renal_hepatic_considerations?: { renal?: string; hepatic?: string };
  monitoring_parameters?: string[];
  counseling_points?: string[];
  pakistan_brand_names?: { brand?: string; strengths?: string[]; company?: string; dosage_forms?: string[] }[];
  related_clinical_case?: { scenario?: string; discussion?: string; pearls?: string[] };
  faq?: { question?: string; answer?: string }[];
  references?: string[];
  safety_disclaimer?: string;
};

type PharmaMcq = {
  question?: string;
  options?: Record<'A' | 'B' | 'C' | 'D', string>;
  correct?: string;
  explanation?: string;
};

type PharmaSuggestion = {
  name: string;
  cls: string;
};

const COMMON_MEDICINES = [
  'Paracetamol',
  'Amoxicillin',
  'Azithromycin',
  'Cefixime',
  'Metformin',
  'Insulin glargine',
  'Losartan',
  'Amlodipine',
  'Atorvastatin',
  'Omeprazole',
  'Pantoprazole',
  'Cetirizine',
  'Montelukast',
  'Salbutamol',
  'Ibuprofen',
  'Diclofenac',
  'Ciprofloxacin',
  'Doxycycline',
  'Fluconazole',
  'Folic acid',
  'Levothyroxine',
  'Clopidogrel',
  'Warfarin',
  'Aspirin',
];

const NAV_SECTIONS = [
  ['overview', 'Overview'],
  ['uses', 'Uses'],
  ['safety', 'Safety'],
  ['dosing', 'Dosing'],
  ['brands', 'PK Brands'],
  ['case', 'Clinical Case'],
  ['mcqs', 'MCQs'],
  ['refs', 'Refs'],
] as const;

export function PharmaPulseClient() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<PharmaMode>('student');
  const [bright, setBright] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [result, setResult] = useState<DrugInfo | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<PharmaSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});
  const [mcqs, setMcqs] = useState<PharmaMcq[]>([]);
  const [selectedMcqs, setSelectedMcqs] = useState<Record<number, string>>({});
  const [shownAnswers, setShownAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('pharmapulse_history') || '[]'));
      setMode((localStorage.getItem('pharmapulse_mode') as PharmaMode) || 'student');
      setBright(localStorage.getItem('pharmapulse_bright') === 'true');
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pharmapulse_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('pharmapulse_bright', String(bright));
  }, [bright]);

  const localSuggestions = useMemo<PharmaSuggestion[]>(() => {
    const term = query.trim().toLowerCase();
    const items = !term
      ? COMMON_MEDICINES.slice(0, 8)
      : COMMON_MEDICINES.filter((item) => item.toLowerCase().includes(term)).slice(0, 8);
    return items.map((name) => ({ name, cls: 'Common medicine' }));
  }, [query]);

  useEffect(() => {
    const term = query.trim();
    if (!showSuggestions || term.length < 2) {
      setAiSuggestions([]);
      setSuggestionLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/pharmapulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'suggestions', query: term }),
        });
        const json = await res.json();
        if (!cancelled && json.status === 'success') {
          setAiSuggestions(Array.isArray(json.data.result) ? json.data.result : []);
        }
      } catch {
        if (!cancelled) setAiSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, showSuggestions]);

  const suggestions = aiSuggestions.length ? aiSuggestions : localSuggestions;
  const currentName = result?.medicine_name || query || 'Medicine';

  function saveHistory(name: string) {
    const next = [name, ...history.filter((item) => item.toLowerCase() !== name.toLowerCase())].slice(0, 12);
    setHistory(next);
    localStorage.setItem('pharmapulse_history', JSON.stringify(next));
  }

  async function searchDrug(searchTerm = query) {
    const q = searchTerm.trim();
    if (!q) {
      toast.error('Enter a medicine name.');
      return;
    }
    setQuery(q);
    setShowSuggestions(false);
    setLoading(true);
    setMcqs([]);
    setSelectedMcqs({});
    setShownAnswers({});
    setOpenFaqs({});

    try {
      const res = await fetch('/api/ai/pharmapulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drug', query: q, mode }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data.result);
      saveHistory(json.data.result?.medicine_name || q);
    } catch {
      toast.error('PharmaPulse could not return a response.');
    } finally {
      setLoading(false);
    }
  }

  async function generateMcqs() {
    if (!currentName) return;
    setMcqLoading(true);
    setSelectedMcqs({});
    setShownAnswers({});
    try {
      const res = await fetch('/api/ai/pharmapulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mcq', query: currentName, mode }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setMcqs(json.data.result || []);
    } catch {
      toast.error('MCQs could not be generated.');
    } finally {
      setMcqLoading(false);
    }
  }

  function speakSummary() {
    if (!result) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${currentName}. ${result.drug_class || ''}. ${result.overview?.summary || ''}`);
    utterance.rate = 0.88;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  async function copySummary() {
    if (!result) return;
    const text = [
      currentName,
      `Class: ${result.drug_class || '-'}`,
      '',
      result.overview?.summary || '',
      '',
      `Uses: ${(result.therapeutic_uses || []).slice(0, 5).join(', ')}`,
      `Pakistan brands: ${(result.pakistan_brand_names || []).slice(0, 5).map((brand) => brand.brand).filter(Boolean).join(', ')}`,
      '',
      result.safety_disclaimer || 'Educational use only. Verify clinically.',
    ].join('\n');
    await navigator.clipboard.writeText(text);
    toast.success('Summary copied');
  }

  return (
    <div
      className={cn(
        'mx-auto max-w-7xl space-y-5 transition-colors',
        bright && 'rounded-lg bg-slate-50 p-3 text-slate-950 dark:bg-slate-50 dark:text-slate-950'
      )}
    >
      <section className="overflow-hidden rounded-lg border bg-card/90">
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-500">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">PharmaPulse</p>
                <p className="text-xs text-muted-foreground">Pakistan drug intelligence</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn('rounded-md border px-3 py-2 text-xs font-semibold', mode === 'student' && 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300')}
                onClick={() => setMode('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={cn('rounded-md border px-3 py-2 text-xs font-semibold', mode === 'patient' && 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300')}
                onClick={() => setMode('patient')}
              >
                Patient
              </button>
            </div>

            <button
              type="button"
              className="mt-3 flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground"
              onClick={() => setBright((value) => !value)}
            >
              Bright reading mode
              <span className={cn('h-4 w-8 rounded-full border p-0.5', bright && 'bg-cyan-500')}>
                <span className={cn('block h-2.5 w-2.5 rounded-full bg-current transition-transform', bright && 'translate-x-3.5 text-white')} />
              </span>
            </button>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">History</p>
                {history.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('pharmapulse_history');
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {history.length ? history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground"
                    onClick={() => searchDrug(item)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate">{item}</span>
                  </button>
                )) : (
                  <p className="rounded-md border border-dashed p-3 text-xs leading-5 text-muted-foreground">Your search history will appear here.</p>
                )}
              </div>
            </div>
          </aside>

          <div className="p-4 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Badge variant="secondary" className="mb-3 gap-1"><Stethoscope className="h-3 w-3" /> Medical Students</Badge>
                <h1 className="text-2xl font-bold md:text-3xl">PharmaPulse Drug Intelligence</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Pharmacology monographs, Pakistan brand names, dosing, interactions, counseling, clinical cases and practice MCQs.
                </p>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                Educational support only. Prescribing, dispensing and emergency decisions must be verified by licensed clinicians.
              </div>
            </div>

            <div className="relative mt-5">
              <div className="flex flex-col gap-2 rounded-lg border bg-background p-2 shadow-sm sm:flex-row sm:items-center">
                <Search className="ml-2 mt-2.5 hidden h-4 w-4 shrink-0 text-cyan-500 sm:block" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') searchDrug();
                  }}
                  placeholder="Search generic or brand name, e.g. Augmentin, metformin, losartan"
                  className="h-10 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none focus:ring-0 sm:px-0"
                />
                <Button variant="gradient" className="w-full sm:w-auto" onClick={() => searchDrug()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Search
                </Button>
              </div>
              {showSuggestions && (suggestionLoading || suggestions.length > 0) && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-lg border bg-popover shadow-xl">
                  {suggestionLoading && (
                    <div className="border-b px-4 py-2.5 text-center text-xs text-muted-foreground">Finding medicines...</div>
                  )}
                  {suggestions.map((item) => (
                    <button
                      key={`${item.name}-${item.cls}`}
                      type="button"
                      className="flex w-full items-center justify-between border-b px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-cyan-500/10"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => searchDrug(item.name)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.cls}</span>
                      </span>
                      <span className="ml-3 shrink-0 text-xs text-cyan-600 dark:text-cyan-300">Open</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!result && !loading && <EmptyPharmaState onPick={searchDrug} />}
            {loading && <PharmaLoading query={query} />}
            {result && !loading && (
              <div className="mt-6 space-y-5">
                <DrugHero
                  result={result}
                  onStructure={() => setStructureOpen(true)}
                  onMcq={generateMcqs}
                  onSpeak={speakSummary}
                  onCopy={copySummary}
                  onPrint={() => printElementById('pharmapulse-export', `${currentName} - PharmaPulse`)}
                  onExport={() => exportPharmaPulsePdf(result, mode)}
                />

                <div className="sticky top-16 z-20 -mx-4 overflow-x-auto border-y bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
                  <div className="flex gap-2">
                    {NAV_SECTIONS.map(([id, label]) => (
                      <a key={id} href={`#pharma-${id}`} className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-500">
                        {label}
                      </a>
                    ))}
                  </div>
                </div>

                <div id="pharmapulse-export" className="space-y-4">
                  <section id="pharma-overview" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <InfoSection title="Overview" icon={BookOpen} accent="cyan">
                      <p className="text-sm leading-6 text-muted-foreground">{result.overview?.summary || 'No overview generated.'}</p>
                      <List items={result.overview?.key_points} />
                    </InfoSection>
                    <InfoSection title="Mechanism of Action" icon={FlaskConical} accent="violet">
                      <p className="text-sm leading-6 text-muted-foreground">{result.mechanism_of_action || 'No mechanism generated.'}</p>
                    </InfoSection>
                  </section>

                  <section id="pharma-uses" className="grid gap-4 lg:grid-cols-2">
                    <InfoSection title="Therapeutic Uses" icon={CheckCircle2} accent="emerald">
                      <List items={result.therapeutic_uses} />
                    </InfoSection>
                    <InfoSection title="PK / PD" icon={Sparkles} accent="blue">
                      <KeyValueGrid value={result.pharmacokinetics_pharmacodynamics} />
                    </InfoSection>
                  </section>

                  <section id="pharma-safety" className="grid gap-4 lg:grid-cols-3">
                    <InfoSection title="Adverse Reactions" icon={AlertTriangle} accent="amber">
                      <SubList label="Common" items={result.adverse_reactions?.common} />
                      <SubList label="Serious" items={result.adverse_reactions?.serious} tone="danger" />
                      <SubList label="Seek help when" items={result.adverse_reactions?.seek_medical_help_when} tone="danger" />
                    </InfoSection>
                    <InfoSection title="Contraindications" icon={ShieldAlert} accent="rose">
                      <SubList label="Absolute" items={result.contraindications?.absolute} tone="danger" />
                      <SubList label="Cautions" items={result.contraindications?.cautions} />
                    </InfoSection>
                    <InfoSection title="Interactions" icon={X} accent="orange">
                      <SubList label="Major" items={result.drug_interactions?.major} tone="danger" />
                      <SubList label="Moderate" items={result.drug_interactions?.moderate} />
                      <SubList label="Administration" items={result.drug_interactions?.administration_notes} />
                    </InfoSection>
                  </section>

                  <section id="pharma-dosing" className="grid gap-4 lg:grid-cols-2">
                    <InfoSection title="Adult Dosing" icon={Pill} accent="cyan">
                      <List items={result.adult_dosing} />
                    </InfoSection>
                    <InfoSection title="Pediatric Dosing" icon={Pill} accent="violet">
                      <List items={result.pediatric_dosing} />
                    </InfoSection>
                    <InfoSection title="Pregnancy & Lactation" icon={ShieldAlert} accent="amber">
                      <KeyValueGrid value={result.pregnancy_lactation} />
                    </InfoSection>
                    <InfoSection title="Renal / Hepatic" icon={ShieldAlert} accent="blue">
                      <KeyValueGrid value={result.renal_hepatic_considerations} />
                    </InfoSection>
                  </section>

                  <section id="pharma-brands">
                    <InfoSection title="Pakistan Brand Names" icon={Pill} accent="cyan">
                      <BrandGrid brands={result.pakistan_brand_names} />
                    </InfoSection>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <InfoSection title="Patient Counseling" icon={Stethoscope} accent="emerald">
                      <List items={result.counseling_points} />
                    </InfoSection>
                    <InfoSection title="Monitoring Parameters" icon={FileText} accent="violet">
                      <List items={result.monitoring_parameters} />
                    </InfoSection>
                  </section>

                  <section id="pharma-case" className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                    <InfoSection title="Related Clinical Case" icon={Stethoscope} accent="emerald">
                      <SubBlock label="Scenario" text={result.related_clinical_case?.scenario} />
                      <SubBlock label="Discussion" text={result.related_clinical_case?.discussion} />
                      <SubList label="Clinical pearls" items={result.related_clinical_case?.pearls} />
                    </InfoSection>
                    <InfoSection title="Frequently Asked Questions" icon={ChevronDown} accent="blue">
                      <div className="divide-y">
                        {(result.faq || []).map((faq, index) => (
                          <div key={`${faq.question}-${index}`} className="py-3">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
                              onClick={() => setOpenFaqs((items) => ({ ...items, [index]: !items[index] }))}
                            >
                              <span>{faq.question}</span>
                              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', openFaqs[index] && 'rotate-180')} />
                            </button>
                            {openFaqs[index] && <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>}
                          </div>
                        ))}
                      </div>
                    </InfoSection>
                  </section>

                  <section id="pharma-mcqs">
                    <InfoSection title="Pharmacology MCQs" icon={Sparkles} accent="violet">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">Practice questions generated from this monograph.</p>
                        <Button variant="outline" size="sm" onClick={generateMcqs} disabled={mcqLoading}>
                          {mcqLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Generate MCQs
                        </Button>
                      </div>
                      {mcqLoading && <PharmaMiniLoader label={`Generating MCQs for ${currentName}...`} />}
                      {mcqs.length > 0 && (
                        <div className="space-y-3">
                          {mcqs.map((mcq, index) => (
                            <McqCard
                              key={`${mcq.question}-${index}`}
                              mcq={mcq}
                              index={index}
                              selected={selectedMcqs[index]}
                              showAnswer={shownAnswers[index]}
                              onPick={(choice) => setSelectedMcqs((items) => ({ ...items, [index]: choice }))}
                              onToggleAnswer={() => setShownAnswers((items) => ({ ...items, [index]: !items[index] }))}
                            />
                          ))}
                        </div>
                      )}
                    </InfoSection>
                  </section>

                  <section id="pharma-refs">
                    <InfoSection title="References & Disclaimer" icon={BookOpen} accent="slate">
                      <List items={result.references} />
                      <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                        {result.safety_disclaimer || 'This tool is for educational support only. Verify clinically before use.'}
                      </div>
                    </InfoSection>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {structureOpen && result && (
        <StructureModal drug={result} onClose={() => setStructureOpen(false)} />
      )}
    </div>
  );
}

function EmptyPharmaState({ onPick }: { onPick: (value: string) => void }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
      <Card className="border-dashed">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
          <Pill className="mb-4 h-10 w-10 text-cyan-500" />
          <h2 className="font-semibold">Search a medicine to build a full drug card</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Start with a generic or Pakistani brand name. The result opens as a student-ready monograph with safety, dosing, Pakistan brands and MCQ practice.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {COMMON_MEDICINES.slice(0, 8).map((item) => (
          <button
            key={item}
            type="button"
            className="flex items-center justify-between rounded-md border bg-card/80 px-4 py-3 text-left text-sm font-medium hover:border-cyan-500/50 hover:bg-cyan-500/10"
            onClick={() => onPick(item)}
          >
            {item}
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PharmaLoading({ query }: { query: string }) {
  return (
    <div className="mt-6 rounded-lg border bg-card/80 p-8">
      <PharmaMiniLoader label={`Building clinical monograph for ${query || 'medicine'}...`} />
      <div className="mx-auto mt-8 grid max-w-3xl gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function PharmaMiniLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-500">
        <Pill className="h-6 w-6 animate-pulse" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
      </div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex h-5 items-end gap-1">
        {[0, 1, 2, 3].map((item) => (
          <span key={item} className="h-4 w-1 rounded-full bg-cyan-500/70 [animation:equalizer_.55s_ease-in-out_infinite_alternate]" style={{ animationDelay: `${item * 0.08}s` }} />
        ))}
      </div>
    </div>
  );
}

function DrugHero({
  result,
  onStructure,
  onMcq,
  onSpeak,
  onCopy,
  onPrint,
  onExport,
}: {
  result: DrugInfo;
  onStructure: () => void;
  onMcq: () => void;
  onSpeak: () => void;
  onCopy: () => void;
  onPrint: () => void;
  onExport: () => void;
}) {
  return (
    <div className="rounded-lg border bg-gradient-to-br from-cyan-500/12 via-card to-emerald-500/10 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <button type="button" onClick={onStructure} className="group mx-auto flex h-36 w-full max-w-56 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 transition-transform hover:scale-[1.03] sm:mx-0 sm:h-32 sm:w-32">
          <MoleculeShape drugClass={result.drug_class || ''} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-500">Drug monograph</p>
          <h2 className="mt-1 text-3xl font-bold md:text-4xl">{result.medicine_name || 'Medicine'}</h2>
          {result.aliases?.length ? <p className="mt-2 text-sm text-cyan-600 dark:text-cyan-300">Also known as: {result.aliases.join(', ')}</p> : null}
          <p className="mt-1 text-sm text-muted-foreground">{result.drug_class || 'Drug class not specified'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="info">PK brands</Badge>
            <Badge variant="warning">Safety caveats</Badge>
            <Badge variant="success">MCQ practice</Badge>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:flex-wrap">
        <Button variant="outline" size="sm" className="justify-center" onClick={onStructure}><FlaskConical className="h-3.5 w-3.5" /> Structure</Button>
        <Button variant="outline" size="sm" className="justify-center" onClick={onMcq}><Sparkles className="h-3.5 w-3.5" /> MCQs</Button>
        <Button variant="outline" size="sm" className="justify-center" onClick={onSpeak}><Volume2 className="h-3.5 w-3.5" /> Speak</Button>
        <Button variant="outline" size="sm" className="justify-center" onClick={onCopy}><Clipboard className="h-3.5 w-3.5" /> Copy</Button>
        <Button variant="outline" size="sm" className="justify-center" onClick={onPrint}><Printer className="h-3.5 w-3.5" /> Print</Button>
        <Button variant="outline" size="sm" className="justify-center" onClick={onExport}><Download className="h-3.5 w-3.5" /> Export PDF</Button>
      </div>
    </div>
  );
}

function exportPharmaPulsePdf(drug: DrugInfo, mode: PharmaMode) {
  const win = window.open('', '_blank', 'width=920,height=900');
  if (!win) {
    toast.error('Allow pop-ups to export the PDF.');
    return;
  }

  const date = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  const name = cleanHtml(drug.medicine_name || 'Medicine');
  const brands = (drug.pakistan_brand_names || []).map((brand) => {
    const strength = (brand.strengths || []).filter(Boolean).join(' / ');
    const forms = (brand.dosage_forms || []).filter(Boolean).join(', ');
    return `<span class="brand"><strong>${cleanHtml(brand.brand || 'Brand')}</strong>${strength ? ` ${cleanHtml(strength)}` : ''}${brand.company ? ` - ${cleanHtml(brand.company)}` : ''}${forms ? `<small>${cleanHtml(forms)}</small>` : ''}</span>`;
  }).join('');

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} - PharmaPulse</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0 auto; max-width: 850px; padding: 26px; color: #111827; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
    h1 { margin: 0 0 4px; color: #0369a1; font-size: 24px; line-height: 1.2; }
    h2 { margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 1.5px solid #bae6fd; color: #0369a1; font-size: 15px; page-break-after: avoid; }
    h3 { margin: 12px 0 5px; color: #0284c7; font-size: 13px; page-break-after: avoid; }
    p { margin: 6px 0; line-height: 1.58; }
    ul { margin: 5px 0; padding-left: 18px; }
    li { margin: 3px 0; line-height: 1.45; }
    section { page-break-inside: avoid; }
    .meta { margin-bottom: 16px; color: #64748b; font-size: 12px; }
    .pill { display: inline-block; margin: 3px 4px 3px 0; padding: 4px 8px; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: 11px; font-weight: 700; }
    .brand { display: inline-block; max-width: 100%; margin: 4px 6px 4px 0; padding: 6px 9px; border: 1px solid #bae6fd; border-radius: 6px; background: #f0f9ff; color: #0f172a; font-size: 12px; vertical-align: top; }
    .brand small { display: block; margin-top: 2px; color: #64748b; }
    .note { margin-top: 18px; padding: 10px 14px; border: 1px solid #facc15; border-radius: 6px; background: #fef9c3; color: #713f12; font-size: 12px; line-height: 1.55; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #94a3b8; text-align: center; font-size: 11px; }
    @media print {
      @page { margin: 14mm; }
      body { max-width: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>PharmaPulse: ${name}</h1>
  <div class="meta">Generated by ilm AI | ${date} | Mode: ${cleanHtml(mode)}</div>
  ${drug.aliases?.length ? `<p><strong>Also known as:</strong> ${cleanHtml(drug.aliases.join(', '))}</p>` : ''}
  <p><strong>Drug Class:</strong> ${cleanHtml(drug.drug_class || 'Not specified')}</p>
  <div><span class="pill">Pakistan brands</span><span class="pill">Safety caveats</span><span class="pill">Medical students</span></div>

  ${reportSection('Overview', `${paragraph(drug.overview?.summary)}${listHtml(drug.overview?.key_points)}`)}
  ${reportSection('Therapeutic Uses', listHtml(drug.therapeutic_uses))}
  ${reportSection('Mechanism of Action', paragraph(drug.mechanism_of_action))}
  ${reportSection('Pharmacokinetics / Pharmacodynamics', keyValueHtml(drug.pharmacokinetics_pharmacodynamics))}
  ${reportSection('Adverse Reactions', `${subListHtml('Common', drug.adverse_reactions?.common)}${subListHtml('Serious', drug.adverse_reactions?.serious)}${subListHtml('Seek medical help when', drug.adverse_reactions?.seek_medical_help_when)}`)}
  ${reportSection('Contraindications & Cautions', `${subListHtml('Absolute', drug.contraindications?.absolute)}${subListHtml('Cautions', drug.contraindications?.cautions)}`)}
  ${reportSection('Adult Dosing', listHtml(drug.adult_dosing))}
  ${reportSection('Pediatric Dosing', listHtml(drug.pediatric_dosing))}
  ${reportSection('Drug Interactions', `${subListHtml('Major', drug.drug_interactions?.major)}${subListHtml('Moderate', drug.drug_interactions?.moderate)}${subListHtml('Administration notes', drug.drug_interactions?.administration_notes)}`)}
  ${reportSection('Pakistan Brand Names', brands || '<p>No Pakistan brand data generated.</p>')}
  ${reportSection('Pregnancy & Lactation', `${labelParagraph('Pregnancy', drug.pregnancy_lactation?.pregnancy)}${labelParagraph('Lactation', drug.pregnancy_lactation?.lactation)}`)}
  ${reportSection('Renal / Hepatic Considerations', `${labelParagraph('Renal', drug.renal_hepatic_considerations?.renal)}${labelParagraph('Hepatic', drug.renal_hepatic_considerations?.hepatic)}`)}
  ${reportSection('Counseling Points', listHtml(drug.counseling_points))}
  ${reportSection('Monitoring Parameters', listHtml(drug.monitoring_parameters))}
  ${reportSection('Clinical Case', `${paragraph(drug.related_clinical_case?.scenario)}${paragraph(drug.related_clinical_case?.discussion)}${subListHtml('Pearls', drug.related_clinical_case?.pearls)}`)}
  ${reportSection('References', listHtml(drug.references))}
  <div class="note">${cleanHtml(drug.safety_disclaimer || 'This information is for educational purposes only and should be verified by a licensed clinician before prescribing or dispensing.')}</div>
  <div class="footer">ilm AI PharmaPulse - educational drug intelligence report</div>
  <script>setTimeout(() => window.print(), 500);</script>
</body>
</html>`);
  win.document.close();
}

function cleanHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraph(value?: string) {
  return value ? `<p>${cleanHtml(value)}</p>` : '<p>No data listed.</p>';
}

function labelParagraph(label: string, value?: string) {
  return value ? `<p><strong>${cleanHtml(label)}:</strong> ${cleanHtml(value)}</p>` : '';
}

function reportSection(title: string, body: string) {
  return `<section><h2>${cleanHtml(title)}</h2>${body || '<p>No data listed.</p>'}</section>`;
}

function listHtml(items?: string[]) {
  const cleanItems = (items || []).filter(Boolean);
  if (!cleanItems.length) return '<p>No data listed.</p>';
  return `<ul>${cleanItems.map((item) => `<li>${cleanHtml(item)}</li>`).join('')}</ul>`;
}

function subListHtml(title: string, items?: string[]) {
  const cleanItems = (items || []).filter(Boolean);
  if (!cleanItems.length) return '';
  return `<h3>${cleanHtml(title)}</h3>${listHtml(cleanItems)}`;
}

function keyValueHtml(value?: Record<string, string>) {
  const entries = Object.entries(value || {}).filter(([, item]) => Boolean(item));
  if (!entries.length) return '<p>No data listed.</p>';
  return entries.map(([key, item]) => `<p><strong>${cleanHtml(key.replace(/_/g, ' '))}:</strong> ${cleanHtml(item)}</p>`).join('');
}

function InfoSection({ title, icon: Icon, accent, children }: { title: string; icon: React.ElementType; accent: string; children: React.ReactNode }) {
  const accentClass: Record<string, string> = {
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500',
  };

  return (
    <Card className="h-full rounded-lg">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b p-4">
          <span className={cn('h-6 w-1 rounded-full', accentClass[accent] || 'bg-cyan-500')} />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No data listed.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SubList({ label, items, tone }: { label: string; items?: string[]; tone?: 'danger' }) {
  if (!items?.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className={cn('mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground', tone === 'danger' && 'text-rose-500')}>{label}</p>
      <List items={items} />
    </div>
  );
}

function SubBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="mb-4 rounded-md border bg-muted/20 p-3 last:mb-0">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function KeyValueGrid({ value }: { value?: Record<string, string> }) {
  const entries = Object.entries(value || {}).filter(([, item]) => Boolean(item));
  if (!entries.length) return <p className="text-sm text-muted-foreground">No data listed.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div key={key} className="rounded-md border bg-muted/20 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{key.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item}</p>
        </div>
      ))}
    </div>
  );
}

function BrandGrid({ brands }: { brands?: DrugInfo['pakistan_brand_names'] }) {
  if (!brands?.length) return <p className="text-sm text-muted-foreground">No Pakistan brand data generated.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {brands.map((brand, index) => (
        <div key={`${brand.brand}-${index}`} className="rounded-md border bg-muted/20 p-4">
          <p className="font-semibold text-cyan-600 dark:text-cyan-300">{brand.brand || 'Brand'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{brand.company || 'Company not listed'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(brand.strengths || []).map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
            {(brand.dosage_forms || []).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function McqCard({
  mcq,
  index,
  selected,
  showAnswer,
  onPick,
  onToggleAnswer,
}: {
  mcq: PharmaMcq;
  index: number;
  selected?: string;
  showAnswer?: boolean;
  onPick: (choice: string) => void;
  onToggleAnswer: () => void;
}) {
  const correct = String(mcq.correct || '').toUpperCase();
  const choices = Object.entries(mcq.options || {}) as [string, string][];

  return (
    <div className="rounded-md border bg-muted/15 p-4">
      <p className="font-semibold">{index + 1}. {mcq.question}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {choices.map(([key, value]) => {
          const picked = selected === key;
          const isCorrect = key === correct;
          const reveal = Boolean(selected);
          return (
            <button
              key={key}
              type="button"
              disabled={Boolean(selected)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                !reveal && 'hover:border-cyan-500 hover:bg-cyan-500/10',
                reveal && isCorrect && 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                reveal && picked && !isCorrect && 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              )}
              onClick={() => onPick(key)}
            >
              <strong>{key}.</strong> {value}
            </button>
          );
        })}
      </div>
      <button type="button" className="mt-3 text-sm font-semibold text-cyan-600 dark:text-cyan-300" onClick={onToggleAnswer}>
        {showAnswer ? 'Hide answer' : 'Show answer & explanation'}
      </button>
      {showAnswer && (
        <div className="mt-3 rounded-md border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm leading-6 text-muted-foreground">
          Correct: <strong>{correct || '-'}</strong>
          {mcq.explanation ? <p className="mt-1">{mcq.explanation}</p> : null}
        </div>
      )}
    </div>
  );
}

function StructureModal({ drug, onClose }: { drug: DrugInfo; onClose: () => void }) {
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [imageError, setImageError] = useState(false);
  const drugName = drug.medicine_name || 'Medicine';
  const pubChemImageUrl = getPubChemImageUrl(drugName, view, drug.aliases || []);
  const pubChemSearchUrl = getPubChemSearchUrl(drugName);

  useEffect(() => {
    setImageError(false);
  }, [view, drugName]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border bg-card p-4 shadow-2xl sm:max-w-2xl sm:rounded-lg sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-500">PubChem molecular structure</p>
            <h2 className="mt-1 text-2xl font-bold">{drugName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{drug.drug_class || 'General therapeutic agent'}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-md border bg-muted/20 p-1">
          <button
            type="button"
            className={cn('rounded px-3 py-2 text-sm font-semibold transition-colors', view === '2d' ? 'bg-background text-cyan-600 shadow-sm dark:text-cyan-300' : 'text-muted-foreground')}
            onClick={() => setView('2d')}
          >
            2D PubChem
          </button>
          <button
            type="button"
            className={cn('rounded px-3 py-2 text-sm font-semibold transition-colors', view === '3d' ? 'bg-background text-cyan-600 shadow-sm dark:text-cyan-300' : 'text-muted-foreground')}
            onClick={() => setView('3d')}
          >
            3D PubChem
          </button>
        </div>

        <div className="my-5 flex justify-center rounded-lg border bg-white p-3 shadow-inner dark:bg-slate-950 sm:p-6">
          <div className="flex aspect-square w-full max-w-[18rem] items-center justify-center sm:max-w-sm">
            {!imageError ? (
              <img
                key={pubChemImageUrl}
                src={pubChemImageUrl}
                alt={`${view.toUpperCase()} molecular structure for ${drugName}`}
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-5 text-center">
                <FlaskConical className="h-10 w-10 text-cyan-500" />
                <p className="mt-3 text-sm font-semibold">Structure image is not available for this exact name.</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Try searching the official generic name or a simpler salt name.</p>
              </div>
            )}
          </div>
        </div>
        <div className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Source</p>
            <p className="mt-1 font-semibold">PubChem</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">View</p>
            <p className="mt-1 font-semibold">{view === '2d' ? '2D structure' : '3D conformer / 2D fallback'}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Compound</p>
            <p className="mt-1 break-words font-semibold">{drugName}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="justify-center">
            <a href={pubChemImageUrl} target="_blank" rel="noreferrer">
              <FlaskConical className="h-4 w-4" />
              Open {view.toUpperCase()} image
            </a>
          </Button>
          <Button asChild className="justify-center">
            <a href={pubChemSearchUrl} target="_blank" rel="noreferrer">
              <Search className="h-4 w-4" />
              Open PubChem
            </a>
          </Button>
        </div>
        <p className="mt-3 rounded-md border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm leading-6 text-muted-foreground">
          Structures are resolved through PubChem CID using the medicine name and aliases, then loaded inside ilm AI. Brand or combination products may still need the generic name.
        </p>
      </div>
    </div>
  );
}

function getPubChemImageUrl(drugName: string, view: '2d' | '3d', aliases: string[]) {
  const params = new URLSearchParams({
    name: drugName.trim() || 'medicine',
    view,
  });
  const cleanAliases = aliases.map((item) => item.trim()).filter(Boolean).slice(0, 8);
  if (cleanAliases.length) params.set('aliases', cleanAliases.join('|'));
  return `/api/pubchem/structure?${params.toString()}`;
}

function getPubChemSearchUrl(drugName: string) {
  return `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drugName.trim() || 'medicine')}`;
}

function getMoleculeStyle(drugClass: string) {
  const cls = drugClass.toLowerCase();
  if (cls.includes('antibiotic') || cls.includes('antibacterial')) return { kind: 'antibiotic' as const, color: '#f59e0b', label: 'Antibiotic ring scaffold' };
  if (/arb|ace|antihypertensive|calcium channel|beta/.test(cls)) return { kind: 'cardio' as const, color: '#8b5cf6', label: 'Cardiovascular aromatic scaffold' };
  if (/antidiabetic|insulin|biguanide|sulfonylurea/.test(cls)) return { kind: 'metabolic' as const, color: '#10b981', label: 'Metabolic agent scaffold' };
  return { kind: 'general' as const, color: '#06b6d4', label: 'General pharmacophore scaffold' };
}

function MoleculeShape({ drugClass, large = false }: { drugClass: string; large?: boolean }) {
  const molecule = getMoleculeStyle(drugClass);
  const color = molecule.color;

  if (molecule.kind === 'antibiotic') {
    return (
      <svg viewBox="0 0 140 140" className={cn('h-full w-full', !large && 'p-3')} aria-hidden="true">
        <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="70" cy="70" r="35" strokeWidth="2.7" />
          <path d="M65 45Q50 35 45 20M100 70h15l5 15M70 105c8 4 12 8 12 14" strokeWidth="2.5" />
          <ellipse cx="70" cy="105" rx="9" ry="13" strokeWidth="2" />
          <path d="M47 50 70 38 96 54M44 82 70 102 96 84" strokeWidth="1.6" opacity="0.5" />
        </g>
        <g fill={color} fontWeight="700">
          <circle cx="70" cy="40" r="4" /><text x="66" y="37" fontSize="10">N</text>
          <circle cx="100" cy="70" r="4" /><text x="97" y="74" fontSize="10">S</text>
          <circle cx="45" cy="20" r="3" opacity="0.7" /><text x="61" y="110" fontSize="9">COOH</text>
        </g>
      </svg>
    );
  }

  if (molecule.kind === 'cardio') {
    return (
      <svg viewBox="0 0 140 140" className={cn('h-full w-full', !large && 'p-3')} aria-hidden="true">
        <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="70,30 100,45 100,75 70,90 40,75 40,45" strokeWidth="2.7" />
          <path d="M70 30 100 45M100 75 70 90M40 45 70 30M40 60H25M100 60h15M70 90v22" strokeWidth="2" opacity="0.72" />
          <circle cx="70" cy="60" r="8" strokeWidth="1.8" opacity="0.45" />
        </g>
        <g fill={color} fontWeight="700">
          <circle cx="35" cy="60" r="3" /><text x="18" y="65" fontSize="9">R</text>
          <circle cx="105" cy="60" r="3" /><text x="116" y="65" fontSize="9">OH</text>
          <circle cx="70" cy="112" r="3" /><text x="63" y="124" fontSize="9">NH</text>
        </g>
      </svg>
    );
  }

  if (molecule.kind === 'metabolic') {
    return (
      <svg viewBox="0 0 140 140" className={cn('h-full w-full', !large && 'p-3')} aria-hidden="true">
        <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="70,25 110,45 110,85 70,105 30,85 30,45" strokeWidth="2.7" />
          <path d="M110 45 130 35M110 85 130 95M30 45 15 40M30 85 15 90M48 55h44M48 78h44" strokeWidth="2" opacity="0.72" />
          <circle cx="70" cy="65" r="10" strokeWidth="1.8" opacity="0.42" />
        </g>
        <g fill={color} fontWeight="700">
          <circle cx="70" cy="65" r="4" /><text x="66" y="69" fontSize="10">O</text>
          <circle cx="130" cy="35" r="3" opacity="0.75" />
          <circle cx="130" cy="95" r="3" opacity="0.75" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 140" className={cn('h-full w-full', !large && 'p-3')} aria-hidden="true">
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="70" cy="70" r="33" strokeWidth="3" />
        <circle cx="70" cy="70" r="19" strokeWidth="1.5" opacity="0.45" />
        <path d="M70 37 70 17M103 70h20M70 103v20M37 70H17" strokeWidth="2.5" />
        <path d="M93 47 108 32M93 93l15 15M47 93 32 108M47 47 32 32" strokeWidth="2" opacity="0.55" />
        <polygon points="70,48 89,59 89,81 70,92 51,81 51,59" strokeWidth="2" opacity="0.72" />
      </g>
      <g fill={color}>
        <circle cx="70" cy="17" r="4" opacity="0.65" />
        <circle cx="123" cy="70" r="4" opacity="0.65" />
        <circle cx="70" cy="123" r="4" opacity="0.65" />
        <circle cx="17" cy="70" r="4" opacity="0.65" />
        <text x="64" y="75" fontSize="14" fontWeight="700">Rx</text>
      </g>
    </svg>
  );
}
