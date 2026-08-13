'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import type { PresentationDeck, PresentationSlide } from '@/lib/presentation/types';
import { cn } from '@/lib/utils/cn';

// Exported so the builder's theme picker can reuse the exact same gradients for
// its swatch previews instead of duplicating color values in a second place.
// Deliberately just two entries — the earlier named color themes were replaced
// by a single polished dark look and a single polished light look, each paired
// with dark/light-tagged background photos (PresentationBackground.mode).
export const THEMES = {
  dark: {
    bg: 'linear-gradient(135deg, #0B1120 0%, #131B36 45%, #1E2A54 100%)',
    accent: '#22D3EE',
    accent2: '#FBBF24',
    text: '#F8FAFC',
    subtext: '#B8C4E0',
    cardBg: 'rgba(255,255,255,0.08)',
    // A dark, moody photo needs a dark scrim so white text stays legible.
    overlay: 'linear-gradient(rgba(6,10,22,.7), rgba(6,10,22,.78))',
    scrimClass: 'bg-slate-950/70',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  light: {
    bg: 'linear-gradient(135deg, #FFFFFF 0%, #F3F6FC 50%, #E8EEF9 100%)',
    accent: '#2563EB',
    accent2: '#F59E0B',
    text: '#0F172A',
    subtext: '#475569',
    cardBg: 'rgba(15,23,42,0.045)',
    // A bright photo needs a light scrim so dark text stays legible.
    overlay: 'linear-gradient(rgba(255,255,255,.82), rgba(255,255,255,.88))',
    scrimClass: 'bg-white/75',
    display: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

function themeFor(deck: PresentationDeck): Theme {
  return THEMES[deck.theme] || THEMES.dark;
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

function PrintableSlide({ slide, theme, index, total }: { slide: PresentationSlide; theme: Theme; index: number; total: number }) {
  const title = slide.title || slide.quote || `Slide ${index + 1}`;
  const bullets = slide.bullets || slide.left?.bullets || [];

  return (
    <section
      data-page-break="true"
      style={{
        width: '1080px',
        minHeight: '608px',
        margin: '0 auto 28px',
        padding: '54px 64px',
        borderRadius: '24px',
        background: theme.bg,
        backgroundImage: slide.backgroundImageUrl ? `${theme.overlay}, url("${slide.backgroundImageUrl}")` : theme.bg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: theme.text,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: theme.body,
        boxShadow: '0 18px 45px rgba(15,23,42,.18)',
        // Belt-and-suspenders: the dedicated print stylesheet also forces this,
        // but setting it directly on the slide keeps the gradient/photo visible
        // even if a browser ignores the popup document's <style> block.
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div style={{ position: 'absolute', right: '-80px', top: '-90px', width: 260, height: 260, borderRadius: 999, background: theme.accent, opacity: 0.18 }} />
      <div style={{ position: 'absolute', left: '-70px', bottom: '-90px', width: 220, height: 220, borderRadius: 999, background: theme.accent2, opacity: 0.14 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ width: 82, height: 6, borderRadius: 999, background: theme.accent, marginBottom: 30 }} />
        <p style={{ margin: '0 0 12px', color: theme.subtext, fontSize: 15, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Slide {index + 1} / {total}
        </p>
        <h1 style={{ margin: 0, maxWidth: 900, color: theme.text, fontFamily: theme.display, fontSize: slide.type === 'title' ? 56 : 42, lineHeight: 1.08 }}>
          {title}
        </h1>
        {slide.subtitle && <p style={{ maxWidth: 760, marginTop: 22, color: theme.subtext, fontSize: 24, lineHeight: 1.45 }}>{slide.subtitle}</p>}

        {slide.type === 'two-column' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 34 }}>
            {[slide.left, slide.right].map((col, colIndex) => (
              <div key={colIndex} style={{ background: theme.cardBg, border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: 24 }}>
                <h2 style={{ margin: '0 0 16px', color: theme.accent, fontSize: 24 }}>{col?.heading}</h2>
                <ul style={{ margin: 0, paddingLeft: 22, color: theme.text, fontSize: 20, lineHeight: 1.55 }}>
                  {(col?.bullets || []).slice(0, 5).map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {slide.type === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 38 }}>
            {(slide.stats || []).slice(0, 4).map((stat, statIndex) => (
              <div key={statIndex} style={{ background: theme.cardBg, borderRadius: 18, padding: 22, textAlign: 'center' }}>
                <div style={{ color: theme.accent, fontSize: 38, fontWeight: 800 }}>{stat.value}</div>
                <div style={{ marginTop: 8, color: theme.subtext, fontSize: 16 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {slide.type === 'quote' && (
          <blockquote style={{ margin: '36px 0 0', maxWidth: 820, color: theme.text, fontFamily: theme.display, fontSize: 34, lineHeight: 1.25 }}>
            &ldquo;{slide.quote}&rdquo;
            {slide.author && <footer style={{ marginTop: 18, color: theme.subtext, fontFamily: theme.body, fontSize: 18 }}>- {slide.author}</footer>}
          </blockquote>
        )}

        {slide.type !== 'title' && slide.type !== 'two-column' && slide.type !== 'stats' && slide.type !== 'quote' && bullets.length > 0 && (
          <ul style={{ margin: '34px 0 0', paddingLeft: 28, maxWidth: 860, color: theme.text, fontSize: 24, lineHeight: 1.55 }}>
            {bullets.slice(0, 6).map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PresentationSlideRenderer({ deck, exportId = 'presentation-export', exportAllId = 'presentation-export-all' }: { deck: PresentationDeck; exportId?: string; exportAllId?: string }) {
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
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Presentation data is unavailable.</div>;
  }

  return (
    <div className="space-y-4">
      <div id={exportId} className="mx-auto w-full max-w-5xl">
        <div
          className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
          style={{
            background: theme.bg,
            backgroundImage: slide.backgroundImageUrl ? `url("${slide.backgroundImageUrl}")` : theme.bg,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {slide.backgroundImageUrl && <div className={cn('absolute inset-0', theme.scrimClass)} />}
          <div key={current} className="relative h-full w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
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

      <div
        id={exportAllId}
        data-print-root="true"
        aria-hidden="true"
        style={{ position: 'fixed', left: '-12000px', top: 0, width: '1120px', height: 0, overflow: 'hidden' }}
      >
        {deck.slides.map((deckSlide, index) => (
          <PrintableSlide key={index} slide={deckSlide} theme={theme} index={index} total={total} />
        ))}
      </div>
    </div>
  );
}
