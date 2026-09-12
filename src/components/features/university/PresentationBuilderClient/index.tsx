'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Clock, Download, FileText, Loader2, Moon, PenLine, Presentation, Sparkles, Sun, Type, Undo2, Redo2, Edit3, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { PresentationSlideRenderer, THEMES } from '@/components/features/university/PresentationSlideRenderer';
import { exportPresentationDeckToPdf } from '@/lib/utils/exportPresentationPdf';
import { cn } from '@/lib/utils/cn';
import type { PresentationDeck, PresentationGenerateMode, PresentationHeadingFont, PresentationTheme } from '@/lib/presentation/types';
import { fetchWithOfflineCache } from '@/lib/offline/read-cache';
import { useAuth } from '@/hooks/auth/useAuth';

type Props = {
  defaultSubject?: string;
  defaultStyle?: string;
};

const progressCopy = [
  'Planning university-grade slide flow...',
  'Writing detailed slide content...',
  'Balancing visuals, notes, and viva-ready points...',
  'Preparing a polished PowerPoint preview...',
];

const TOPIC_SUGGESTIONS = [
  'Photosynthesis for university biology students',
  'Machine Learning basics in AI',
  'Climate change impacts on agriculture',
  'Blockchain technology explained',
  'The future of renewable energy',
  'Psychology of human behavior',
  'Economic theories of inflation',
  'History of the internet revolution',
  'Quantum computing fundamentals',
  'Artificial intelligence in healthcare',
];

export function PresentationBuilderClient({ defaultSubject = '', defaultStyle = 'professional' }: Props) {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [slideCount, setSlideCount] = useState(8);
  const [tone, setTone] = useState('Professional');
  const [audienceLevel, setAudienceLevel] = useState('University students');
  const [language, setLanguage] = useState('English');
  const [outputStyle, setOutputStyle] = useState(defaultStyle);
  const [theme, setTheme] = useState<PresentationTheme>('default');
  // Purely a rendering preference (see PresentationHeadingFont's doc comment) — never sent to the
  // generate API, just handed straight to PresentationSlideRenderer.
  const [headingFont, setHeadingFont] = useState<PresentationHeadingFont>('default');
  const [mode, setMode] = useState<PresentationGenerateMode>('per-slide');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [history, setHistory] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  // Undo/redo stack for slide editing
  const [slideHistory, setSlideHistory] = useState<PresentationDeck[]>([]);
  const [slideRedoStack, setSlideRedoStack] = useState<PresentationDeck[]>([]);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const { user } = useAuth();

  const formReady = topic.trim().length > 2;

  // Keyboard shortcut: Ctrl/Cmd + Enter to generate
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (formReady && !loading) {
          generate();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formReady, loading]);

  // Auto-save draft to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (topic.trim()) {
        try {
          localStorage.setItem('ilm-ai-presentation-draft', JSON.stringify({
            topic,
            subject,
            slideCount,
            tone,
            audienceLevel,
            language,
            outputStyle,
            theme,
            headingFont,
            mode,
          }));
        } catch {}
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [topic, subject, slideCount, tone, audienceLevel, language, outputStyle, theme, headingFont, mode]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ilm-ai-presentation-draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.topic) setTopic(draft.topic);
        if (draft.subject) setSubject(draft.subject);
        if (draft.slideCount) setSlideCount(draft.slideCount);
        if (draft.tone) setTone(draft.tone);
        if (draft.audienceLevel) setAudienceLevel(draft.audienceLevel);
        if (draft.language) setLanguage(draft.language);
        if (draft.outputStyle) setOutputStyle(draft.outputStyle);
        if (draft.theme) setTheme(draft.theme);
        if (draft.headingFont) setHeadingFont(draft.headingFont);
        if (draft.mode) setMode(draft.mode);
      }
    } catch {}
  }, []);

  async function loadHistory() {
    if (!user?.id) return;
    try {
      // Mirrors the list into IndexedDB on every successful load and falls back to that mirror
      // when offline, so previously-seen saved presentations still show up with no network at
      // all — same pattern as openSaved() below for opening one of them. The fetcher throws on
      // an app-level error response so a transient failure never overwrites a good cached list.
      const { data: json } = await fetchWithOfflineCache(`presentations:history:${user.id}`, async () => {
        const res = await fetch('/api/presentation/history');
        const body = await res.json();
        if (body.status !== 'success') throw new Error(body.error || 'History could not be loaded.');
        return body;
      });
      setHistory(json.data.presentations);
    } catch {
      // Non-fatal — the builder still works without the saved list loading.
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [user?.id]);

  async function openSaved(id: string) {
    setHistoryLoading(true);
    try {
      const { data: json, fromCache } = await fetchWithOfflineCache(`presentations:deck:${id}`, async () => {
        const res = await fetch(`/api/presentation/history/${id}`);
        const body = await res.json();
        if (body.status !== 'success') throw new Error(body.error || 'This presentation could not be opened.');
        return body;
      });
      setDeck(json.data.deck);
      setActiveHistoryId(id);
      if (fromCache) toast.info('Internet nahi hai — pehle se save kiya hua version dikha rahe hain.');
    } catch {
      toast.error('This presentation could not be opened.');
    } finally {
      setHistoryLoading(false);
    }
  }
  const progressLabel = useMemo(() => {
    if (mode === 'per-slide') {
      return `Detailed mode: generating ${slideCount} slides in small AI batches...`;
    }
    return progressCopy[progressIndex % progressCopy.length];
  }, [mode, progressIndex, slideCount]);

  async function generate() {
    if (!formReady) {
      toast.error('Presentation topic likho.');
      return;
    }
    setLoading(true);
    setProgressIndex(0);
    const timer = window.setInterval(() => setProgressIndex((value) => value + 1), 1800);
    try {
      const res = await fetch('/api/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          slideCount,
          tone,
          audienceLevel,
          language,
          outputStyle,
          theme,
          mode,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error || 'The presentation could not be generated.');
        return;
      }
      setDeck(json.data.deck);
      setActiveHistoryId(null);
      toast.success('The presentation is ready.');
      void loadHistory(); // pick up the row /api/presentation/generate just saved
    } catch {
      toast.error('The presentation could not be generated.');
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function downloadPptx() {
    if (!deck) return;
    setExporting(true);
    try {
      const res = await fetch('/api/presentation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || 'The PPTX export could not be completed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        deck.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'ilm-ai-presentation'
      }.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PPTX download ready.');
    } catch {
      toast.error('The PPTX export could not be completed.');
    } finally {
      setExporting(false);
    }
  }

  // Slide editing functions
  const pushSlideHistory = useCallback((newDeck: PresentationDeck) => {
    setSlideHistory(prev => [...prev.slice(-19), newDeck]); // Keep last 20 states
    setSlideRedoStack([]);
  }, []);

  const updateSlide = useCallback((slideIndex: number, updatedSlide: any) => {
    if (!deck) return;
    const newDeck = {
      ...deck,
      slides: deck.slides.map((slide, index) => index === slideIndex ? updatedSlide : slide),
    };
    pushSlideHistory(newDeck);
    setDeck(newDeck);
    toast.success('Slide updated!');
  }, [deck, pushSlideHistory]);

  const deleteSlide = useCallback((slideIndex: number) => {
    if (!deck) return;
    if (deck.slides.length <= 1) {
      toast.error('At least one slide is required.');
      return;
    }
    const newDeck = {
      ...deck,
      slides: deck.slides.filter((_, index) => index !== slideIndex),
    };
    pushSlideHistory(newDeck);
    setDeck(newDeck);
    toast.success('Slide deleted!');
  }, [deck, pushSlideHistory]);

  const undo = useCallback(() => {
    if (slideHistory.length === 0) return;
    const previous = slideHistory[slideHistory.length - 1];
    setSlideRedoStack(prev => [...prev, deck!]);
    setSlideHistory(prev => prev.slice(0, -1));
    setDeck(previous);
    toast.info('Undo successful');
  }, [slideHistory, deck]);

  const redo = useCallback(() => {
    if (slideRedoStack.length === 0) return;
    const next = slideRedoStack[slideRedoStack.length - 1];
    setSlideHistory(prev => [...prev, deck!]);
    setSlideRedoStack(prev => prev.slice(0, -1));
    setDeck(next);
    toast.info('Redo successful');
  }, [slideRedoStack, deck]);

  const regenerateSlide = useCallback(async (slideIndex: number) => {
    if (!deck || !user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/presentation/regenerate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: deck.topic,
          subject,
          slideIndex,
          currentSlide: deck.slides[slideIndex],
        }),
      });
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.error);
      
      const newDeck = {
        ...deck,
        slides: deck.slides.map((slide, index) => 
          index === slideIndex ? json.slide : slide
        ),
      };
      pushSlideHistory(newDeck);
      setDeck(newDeck);
      toast.success('Slide regenerated with AI!');
    } catch {
      toast.error('Failed to regenerate slide.');
    } finally {
      setLoading(false);
    }
  }, [deck, user, subject, pushSlideHistory]);

  async function downloadPdf() {
    if (!deck) return;
    setExporting(true);
    try {
      const blob = await exportPresentationDeckToPdf('presentation-export-all');
      if (!blob) {
        toast.error('Presentation export content is unavailable.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        deck.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'ilm-ai-presentation'
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF download ready.');
    } catch {
      toast.error('The PDF export could not be completed.');
    } finally {
      setExporting(false);
    }
  }

  async function downloadDocx() {
    if (!deck) return;
    setExporting(true);
    try {
      const res = await fetch('/api/presentation/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || 'The DOCX export could not be completed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        deck.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'ilm-ai-presentation'
      }.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('DOCX download ready.');
    } catch {
      toast.error('The DOCX export could not be completed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            University Mode
          </Badge>
          <h1 className="text-2xl font-bold">AI Presentation Generator</h1>
          <p className="text-muted-foreground">
            Generate colorful university presentations with web preview, speaker notes, and real PPTX export.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Use this as a study draft. Review, personalize, and verify before submission.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <div className="space-y-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Presentation className="h-4 w-4 text-violet-400" />
              Presentation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Topic / prompt"
              value={topic}
              onChange={setTopic}
              placeholder="Photosynthesis for university biology students"
            />
            {!topic && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTopic(suggestion)}
                      className="rounded-full border bg-card px-3 py-1 text-xs transition hover:border-violet-400 hover:bg-violet-50"
                    >
                      {suggestion.length > 35 ? suggestion.slice(0, 35) + '...' : suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field
              label="Subject / course"
              value={subject}
              onChange={setSubject}
              placeholder="Biology, Computer Science, Economics..."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Slides" value={slideCount} onChange={setSlideCount} min={4} max={24} />
              <SelectField
                label="Tone"
                value={tone}
                onChange={setTone}
                options={['Professional', 'Academic', 'Simple', 'Persuasive']}
              />
            </div>
            <Field
              label="Audience level"
              value={audienceLevel}
              onChange={setAudienceLevel}
              placeholder="University students"
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Language"
                value={language}
                onChange={setLanguage}
                options={['English', 'Urdu', 'Roman Urdu']}
              />
              <SelectField
                label="Style"
                value={outputStyle}
                onChange={setOutputStyle}
                options={['simple', 'academic', 'professional', 'detailed']}
              />
            </div>
            <ThemeModePicker value={theme} onChange={setTheme} />
            <HeadingFontPicker value={headingFont} onChange={setHeadingFont} />
            <SelectField
              label="Generation mode"
              value={mode}
              onChange={(value) => setMode(value as PresentationGenerateMode)}
              options={['bulk', 'per-slide']}
            />
            <div className="bg-muted/25 text-muted-foreground rounded-xl border p-3 text-xs leading-5">
              Per-slide mode gives each slide individual attention. Bulk mode creates a compact draft more quickly.
            </div>
            <Button variant="gradient" className="w-full" disabled={!formReady || loading} onClick={generate}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Presentation
              <span className="ml-2 text-xs opacity-70">Ctrl+Enter</span>
            </Button>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-violet-400" />
                Saved Presentations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={historyLoading}
                  onClick={() => void openSaved(item.id)}
                  className={cn(
                    'flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50',
                    activeHistoryId === item.id
                      ? 'border-violet-400 bg-violet-500/10'
                      : 'border-transparent hover:bg-muted/50'
                  )}
                >
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        </div>

        <div className="space-y-4">
          {!deck && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[430px] flex-col items-center justify-center p-8 text-center">
                <FileText className="mb-4 h-11 w-11 text-violet-400" />
                <h2 className="font-semibold">Your slide deck will appear here</h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Enter a topic to generate AI content, a colorful slide preview, and a downloadable PPTX.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="min-h-[430px] p-8">
                <BrandLoader label={progressLabel} className="min-h-[330px]" />
              </CardContent>
            </Card>
          )}

          {deck && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadPptx} disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Presentation className="h-3.5 w-3.5" />
                  )}
                  Download PPTX
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDocx} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Download DOCX
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPdf} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </div>
              {headingFont === 'handwritten' && (
                // PDF export rasterizes the actual on-screen slides (html2canvas → image), so the
                // handwriting font always comes through exactly as shown here — PPTX/DOCX instead
                // reference the font by name, and Kalam is very unlikely to be installed on
                // whoever opens that file, so those fall back to a plain font instead.
                <p className="text-muted-foreground text-xs">
                  Download PDF to keep the handwritten font exactly as shown here — PPTX/DOCX use a plain font instead.
                </p>
              )}
              <PresentationSlideRenderer deck={deck} headingFont={headingFont} />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Slide outline</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={undo} disabled={slideHistory.length === 0}>
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={redo} disabled={slideRedoStack.length === 0}>
                      <Redo2 className="h-4 w-4" />
                      Redo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {deck.slides.map((slide, index) => (
                    <div key={index} className="bg-card/80 rounded-xl border p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-semibold tracking-wide text-violet-400 uppercase">
                          Slide {index + 1} - {slide.type}
                        </p>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingSlide(index)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => deleteSlide(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="mt-1 font-semibold">{slide.title || slide.quote || 'Slide'}</h3>
                      {slide.bullets && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{slide.bullets.join(' / ')}</p>
                      )}
                      {editingSlide === index && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={slide.title || ''}
                            onChange={(e) => updateSlide(index, { ...slide, title: e.target.value })}
                            placeholder="Slide title"
                            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                          />
                          <textarea
                            value={slide.bullets?.join('\n') || ''}
                            onChange={(e) => updateSlide(index, { ...slide, bullets: e.target.value.split('\n').filter(Boolean) })}
                            placeholder="Bullets (one per line)"
                            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                            rows={3}
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => regenerateSlide(index)}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            Regenerate with AI
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      />
    </div>
  );
}

const THEME_MODE_OPTIONS: { key: PresentationTheme; label: string; description: string; icon: typeof Moon }[] = [
  { key: 'default', label: 'Default', description: 'Clean white, blue accents', icon: Sun },
  { key: 'dark', label: 'Dark', description: 'Moody background, white text', icon: Moon },
  { key: 'light', label: 'Light', description: 'Bright background, dark text', icon: Sun },
  { key: 'solar', label: 'Solar', description: 'Warm amber, golden glow', icon: Sun },
  { key: 'ocean', label: 'Ocean', description: 'Deep blue, calm & focused', icon: Moon },
  { key: 'sunset', label: 'Sunset', description: 'Warm orange, dramatic', icon: Sun },
  { key: 'forest', label: 'Forest', description: 'Rich green, natural', icon: Moon },
];

function ThemeModePicker({
  value,
  onChange,
}: {
  value: PresentationTheme;
  onChange: (value: PresentationTheme) => void;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">
        Slide theme
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_MODE_OPTIONS.map(({ key, label, description, icon: Icon }) => {
          const palette = THEMES[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={cn(
                'relative overflow-hidden rounded-xl border-2 p-3 text-left transition',
                active ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-input hover:border-violet-300'
              )}
            >
              <span className="block h-14 w-full rounded-lg ring-1 ring-black/10" style={{ background: palette.bg }} />
              <span className="mt-2 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" style={{ color: palette.accent }} />
                <span className="text-sm font-semibold">{label}</span>
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11px] leading-tight">{description}</span>
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Selected
                </span>
              )}
              </button>
          );
        })}
      </div>
    </div>
  );
}

const HEADING_FONT_OPTIONS: { key: PresentationHeadingFont; label: string; description: string; icon: typeof Type }[] = [
  { key: 'default', label: 'Default', description: 'Clean, standard headings', icon: Type },
  { key: 'handwritten', label: 'Handwritten', description: 'A handwriting font for titles only', icon: PenLine },
];

// Optional — layered on top of the dark/light theme above, not a third theme itself. Only the
// slide titles/section headings switch font; body text and bullets are never affected, so this
// is always safe to try and switch back from.
function HeadingFontPicker({
  value,
  onChange,
}: {
  value: PresentationHeadingFont;
  onChange: (value: PresentationHeadingFont) => void;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">
        Heading font <span className="normal-case font-normal">(optional)</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {HEADING_FONT_OPTIONS.map(({ key, label, description, icon: Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={cn(
                'relative overflow-hidden rounded-xl border-2 p-3 text-left transition',
                active ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-input hover:border-violet-300'
              )}
            >
              <span className={cn('block text-2xl font-bold', key === 'handwritten' && 'font-handwritten')}>Aa</span>
              <span className="mt-1.5 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm font-semibold">{label}</span>
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11px] leading-tight">{description}</span>
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
