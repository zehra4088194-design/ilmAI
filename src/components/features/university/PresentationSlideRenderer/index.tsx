'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import type { PresentationDeck, PresentationSlide } from '@/lib/presentation/types';
import { cn } from '@/lib/utils/cn';

const THEMES = {
  'modern-blue': {
    bg: 'linear-gradient(135deg, #0F2C59 0%, #1B4B8F 55%, #2E7BC4 100%)',
    accent: '#5FD4D0',
    accent2: '#FFC857',
    text: '#F5F9FF',
    subtext: '#BFD7F5',
    cardBg: 'rgba(255,255,255,0.08)',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  'warm-academic': {
    bg: 'linear-gradient(135deg, #3A2418 0%, #6B4226 55%, #9C6B3F 100%)',
    accent: '#E8B15C',
    accent2: '#C1442E',
    text: '#FBF3E7',
    subtext: '#E3C9A8',
    cardBg: 'rgba(255,255,255,0.09)',
    display: 'Georgia, serif',
    body: 'Inter, sans-serif',
  },
  'dark-tech': {
    bg: 'linear-gradient(135deg, #08090D 0%, #12141C 55%, #1B1E2B 100%)',
    accent: '#00E5A0',
    accent2: '#7B5CFF',
    text: '#E9F1F0',
    subtext: '#8FA3A0',
    cardBg: 'rgba(255,255,255,0.05)',
    display: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    body: 'Inter, sans-serif',
  },
  'nature-green': {
    bg: 'linear-gradient(135deg, #0F2E1D 0%, #1E5631 55%, #3E8E56 100%)',
    accent: '#B7E778',
    accent2: '#FFB86B',
    text: '#F2FBF3',
    subtext: '#C7E6CC',
    cardBg: 'rgba(255,255,255,0.08)',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  'vibrant-purple': {
    bg: 'linear-gradient(135deg, #2B0B4E 0%, #6B1FA0 55%, #B23BD9 100%)',
    accent: '#FFD166',
    accent2: '#4CE0D2',
    text: '#FBF3FF',
    subtext: '#E2C6F5',
    cardBg: 'rgba(255,255,255,0.09)',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  'minimal-mono': {
    bg: 'linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%)',
    accent: '#111111',
    accent2: '#8A8A8A',
    text: '#111111',
    subtext: '#555555',
    cardBg: 'rgba(0,0,0,0.04)',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
} as const;

type Theme = (typeof THEMES)[keyof typeof THEMES];

function themeFor(deck: PresentationDeck): Theme {
  return THEMES[deck.theme] || THEMES['modern-blue'];
}

function TitleSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center sm:px-16">
      <div className="mb-5 h-1 w-16 rounded-full sm:mb-8" style={{ background: theme.accent }} />
      <h1 className="text-[clamp(1.65rem,4vw,3.5rem)] font-bold leading-tight" style={{ fontFamily: theme.display, color: theme.text }}>
        {slide.title}
      </h1>
      {slide.subtitle && <p className="mt-4 text-[clamp(0.95rem,2vw,1.45rem)]" style={{ fontFamily: theme.body, color: theme.subtext }}>{slide.subtitle}</p>}
    </div>
  );
}

function BulletsSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col justify-center px-7 py-8 sm:px-14 lg:px-20">
      <h2 className="mb-5 text-[clamp(1.25rem,3vw,2.35rem)] font-bold leading-tight sm:mb-8" style={{ fontFamily: theme.display, color: theme.text }}>{slide.title}</h2>
      <ul className="space-y-3 sm:space-y-5">
        {(slide.bullets || []).slice(0, 6).map((bullet, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: theme.accent }} />
            <span className="text-[clamp(0.88rem,1.9vw,1.35rem)] leading-relaxed" style={{ fontFamily: theme.body, color: theme.text }}>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TwoColumnSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  const columns = [slide.left, slide.right];
  return (
    <div className="flex h-full flex-col justify-center px-6 py-7 sm:px-12">
      <h2 className="mb-4 text-[clamp(1.15rem,2.6vw,2.1rem)] font-bold" style={{ fontFamily: theme.display, color: theme.text }}>{slide.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {columns.map((col, index) => (
          <div key={index} className="rounded-2xl p-4 sm:p-6" style={{ background: theme.cardBg }}>
            <h3 className="mb-3 text-[clamp(0.95rem,1.8vw,1.3rem)] font-semibold" style={{ color: theme.accent }}>{col?.heading}</h3>
            <ul className="space-y-2">
              {(col?.bullets || []).slice(0, 5).map((bullet, bulletIndex) => (
                <li key={bulletIndex} className="text-[clamp(0.78rem,1.45vw,1rem)] leading-relaxed" style={{ color: theme.text }}>- {bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center sm:px-20">
      <span className="text-6xl leading-none" style={{ color: theme.accent }}>&ldquo;</span>
      <p className="mt-1 text-[clamp(1.25rem,3vw,2rem)] italic leading-snug" style={{ fontFamily: theme.display, color: theme.text }}>{slide.quote}</p>
      {slide.author && <p className="mt-5 text-sm sm:text-base" style={{ color: theme.subtext }}>- {slide.author}</p>}
    </div>
  );
}

function StatsSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col justify-center px-6 py-7 sm:px-12">
      <h2 className="mb-6 text-center text-[clamp(1.2rem,2.8vw,2.1rem)] font-bold" style={{ color: theme.text }}>{slide.title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-center sm:gap-5">
        {(slide.stats || []).slice(0, 4).map((stat, index) => (
          <div key={index} className="rounded-2xl px-4 py-4 text-center sm:min-w-[150px] sm:px-6" style={{ background: theme.cardBg }}>
            <div className="text-[clamp(1.35rem,3vw,2.3rem)] font-bold" style={{ color: theme.accent }}>{stat.value}</div>
            <div className="mt-2 text-xs sm:text-sm" style={{ color: theme.subtext }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBreakSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.24em]" style={{ background: theme.accent, color: '#101010' }}>Section</div>
      <h2 className="text-[clamp(1.55rem,3.6vw,2.8rem)] font-bold leading-tight" style={{ color: theme.text }}>{slide.title}</h2>
    </div>
  );
}

function ClosingSlide({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-bold" style={{ color: theme.text }}>{slide.title}</h1>
      {slide.subtitle && <p className="mt-4 text-[clamp(0.95rem,2vw,1.25rem)]" style={{ color: theme.subtext }}>{slide.subtitle}</p>}
    </div>
  );
}

function SlideCanvas({ slide, theme }: { slide: PresentationSlide; theme: Theme }) {
  if (slide.type === 'title') return <TitleSlide slide={slide} theme={theme} />;
  if (slide.type === 'two-column') return <TwoColumnSlide slide={slide} theme={theme} />;
  if (slide.type === 'quote') return <QuoteSlide slide={slide} theme={theme} />;
  if (slide.type === 'stats') return <StatsSlide slide={slide} theme={theme} />;
  if (slide.type === 'section-break') return <SectionBreakSlide slide={slide} theme={theme} />;
  if (slide.type === 'closing') return <ClosingSlide slide={slide} theme={theme} />;
  return <BulletsSlide slide={slide} theme={theme} />;
}

export function PresentationSlideRenderer({ deck, exportId = 'presentation-export' }: { deck: PresentationDeck; exportId?: string }) {
  const [current, setCurrent] = useState(0);
  const total = deck.slides.length;
  const theme = useMemo(() => themeFor(deck), [deck]);
  const slide = deck.slides[current] || deck.slides[0];

  const goNext = useCallback(() => setCurrent((value) => Math.min(value + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((value) => Math.max(value - 1, 0)), []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  if (!slide) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Presentation data nahi mili.</div>;
  }

  return (
    <div className="space-y-4">
      <div id={exportId} className="mx-auto w-full max-w-5xl">
        <div className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10" style={{ background: theme.bg }}>
          <div key={current} className="h-full w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SlideCanvas slide={slide} theme={theme} />
          </div>
          <div className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur" style={{ color: theme.subtext, background: theme.cardBg }}>
            {current + 1} / {total}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goPrev} disabled={current === 0} className="rounded-full bg-foreground px-3 py-3 text-background transition hover:opacity-90 disabled:opacity-30" aria-label="Previous slide">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex max-w-full flex-wrap justify-center gap-2">
          {deck.slides.map((_, index) => (
            <button key={index} type="button" onClick={() => setCurrent(index)} className="p-1" aria-label={`Go to slide ${index + 1}`}>
              <Circle className={cn('h-2.5 w-2.5', index === current ? 'fill-violet-400 text-violet-400' : 'text-muted-foreground')} />
            </button>
          ))}
        </div>
        <button type="button" onClick={goNext} disabled={current === total - 1} className="rounded-full bg-foreground px-3 py-3 text-background transition hover:opacity-90 disabled:opacity-30" aria-label="Next slide">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {slide.speakerNotes && (
        <div className="rounded-xl border bg-card/80 p-4 text-sm leading-6 text-muted-foreground shadow-sm">
          <span className="font-semibold text-foreground">Speaker notes: </span>
          {slide.speakerNotes}
        </div>
      )}
    </div>
  );
}
