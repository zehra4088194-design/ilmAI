/**
 * SlideRenderer.jsx
 * ---------------------------------------------------------
 * Groq se aane wale presentation JSON ko lekar colorful,
 * animated, university-grade slides web par render karta hai.
 *
 * USAGE:
 *   import SlideRenderer from './SlideRenderer';
 *   <SlideRenderer data={groqResultJSON} />
 *
 * `data` shape:
 * {
 *   topic: "...",
 *   theme: "modern-blue" | "warm-academic" | "dark-tech" | "nature-green" | "vibrant-purple" | "minimal-mono",
 *   slides: [ {type, ...}, ... ]
 * }
 * ---------------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";

// ---------- THEME TOKENS ----------
// Har theme: background gradient, accent color, text colors, font pairing
const THEMES = {
  "modern-blue": {
    bg: "linear-gradient(135deg, #0F2C59 0%, #1B4B8F 55%, #2E7BC4 100%)",
    accent: "#5FD4D0",
    accent2: "#FFC857",
    text: "#F5F9FF",
    subtext: "#BFD7F5",
    cardBg: "rgba(255,255,255,0.08)",
    display: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  "warm-academic": {
    bg: "linear-gradient(135deg, #3A2418 0%, #6B4226 55%, #9C6B3F 100%)",
    accent: "#E8B15C",
    accent2: "#C1442E",
    text: "#FBF3E7",
    subtext: "#E3C9A8",
    cardBg: "rgba(255,255,255,0.09)",
    display: "'Playfair Display', serif",
    body: "'Source Sans Pro', sans-serif",
  },
  "dark-tech": {
    bg: "linear-gradient(135deg, #08090D 0%, #12141C 55%, #1B1E2B 100%)",
    accent: "#00E5A0",
    accent2: "#7B5CFF",
    text: "#E9F1F0",
    subtext: "#8FA3A0",
    cardBg: "rgba(255,255,255,0.05)",
    display: "'JetBrains Mono', monospace",
    body: "'Inter', sans-serif",
  },
  "nature-green": {
    bg: "linear-gradient(135deg, #0F2E1D 0%, #1E5631 55%, #3E8E56 100%)",
    accent: "#B7E778",
    accent2: "#FFB86B",
    text: "#F2FBF3",
    subtext: "#C7E6CC",
    cardBg: "rgba(255,255,255,0.08)",
    display: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  "vibrant-purple": {
    bg: "linear-gradient(135deg, #2B0B4E 0%, #6B1FA0 55%, #B23BD9 100%)",
    accent: "#FFD166",
    accent2: "#4CE0D2",
    text: "#FBF3FF",
    subtext: "#E2C6F5",
    cardBg: "rgba(255,255,255,0.09)",
    display: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  "minimal-mono": {
    bg: "linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%)",
    accent: "#111111",
    accent2: "#8A8A8A",
    text: "#111111",
    subtext: "#555555",
    cardBg: "rgba(0,0,0,0.04)",
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
};

function getTheme(name) {
  return THEMES[name] || THEMES["modern-blue"];
}

// ---------- SLIDE LAYOUTS ----------

function TitleSlide({ slide, theme }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16">
      <div
        className="w-16 h-1 rounded-full mb-8"
        style={{ background: theme.accent }}
      />
      <h1
        className="font-bold leading-tight mb-4"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "56px" }}
      >
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p
          className="text-2xl"
          style={{ fontFamily: theme.body, color: theme.subtext }}
        >
          {slide.subtitle}
        </p>
      )}
    </div>
  );
}

function BulletsSlide({ slide, theme }) {
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16">
      <h2
        className="font-bold mb-10"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "38px" }}
      >
        {slide.title}
      </h2>
      <ul className="space-y-6">
        {slide.bullets?.map((b, i) => (
          <li key={i} className="flex items-start gap-4">
            <span
              className="mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: theme.accent }}
            />
            <span
              style={{ fontFamily: theme.body, color: theme.text, fontSize: "22px" }}
            >
              {b}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TwoColumnSlide({ slide, theme }) {
  const Col = ({ col }) => (
    <div
      className="flex-1 rounded-2xl p-8"
      style={{ background: theme.cardBg }}
    >
      <h3
        className="font-semibold mb-5"
        style={{ fontFamily: theme.display, color: theme.accent, fontSize: "24px" }}
      >
        {col?.heading}
      </h3>
      <ul className="space-y-4">
        {col?.bullets?.map((b, i) => (
          <li
            key={i}
            style={{ fontFamily: theme.body, color: theme.text, fontSize: "18px" }}
          >
            • {b}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="h-full flex flex-col justify-center px-16 py-16">
      <h2
        className="font-bold mb-10"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "34px" }}
      >
        {slide.title}
      </h2>
      <div className="flex gap-8">
        <Col col={slide.left} />
        <Col col={slide.right} />
      </div>
    </div>
  );
}

function QuoteSlide({ slide, theme }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-24 text-center">
      <span style={{ color: theme.accent, fontSize: "64px", lineHeight: 0.5 }}>"</span>
      <p
        className="italic mb-6"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "32px" }}
      >
        {slide.quote}
      </p>
      {slide.author && (
        <p style={{ fontFamily: theme.body, color: theme.subtext, fontSize: "18px" }}>
          — {slide.author}
        </p>
      )}
    </div>
  );
}

function StatsSlide({ slide, theme }) {
  return (
    <div className="h-full flex flex-col justify-center px-16 py-16">
      <h2
        className="font-bold mb-12 text-center"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "34px" }}
      >
        {slide.title}
      </h2>
      <div className="flex gap-6 justify-center flex-wrap">
        {slide.stats?.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl px-8 py-6 text-center"
            style={{ background: theme.cardBg, minWidth: "180px" }}
          >
            <div
              className="font-bold mb-2"
              style={{ fontFamily: theme.display, color: theme.accent, fontSize: "40px" }}
            >
              {s.value}
            </div>
            <div style={{ fontFamily: theme.body, color: theme.subtext, fontSize: "16px" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBreakSlide({ slide, theme }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-16">
      <div
        className="px-6 py-2 rounded-full mb-6 text-sm font-semibold tracking-widest uppercase"
        style={{ background: theme.accent, color: "#101010" }}
      >
        Section
      </div>
      <h2
        className="font-bold text-center"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "44px" }}
      >
        {slide.title}
      </h2>
    </div>
  );
}

function ClosingSlide({ slide, theme }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-16 text-center">
      <h1
        className="font-bold mb-4"
        style={{ fontFamily: theme.display, color: theme.text, fontSize: "50px" }}
      >
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p style={{ fontFamily: theme.body, color: theme.subtext, fontSize: "20px" }}>
          {slide.subtitle}
        </p>
      )}
    </div>
  );
}

const LAYOUT_MAP = {
  title: TitleSlide,
  bullets: BulletsSlide,
  "two-column": TwoColumnSlide,
  quote: QuoteSlide,
  stats: StatsSlide,
  "section-break": SectionBreakSlide,
  closing: ClosingSlide,
};

// ---------- MAIN COMPONENT ----------

export default function SlideRenderer({ data }) {
  const [current, setCurrent] = useState(0);

  if (!data || !data.slides || data.slides.length === 0) {
    return <div className="p-10 text-center text-gray-400">Presentation data nahi mili.</div>;
  }

  const theme = getTheme(data.theme);
  const total = data.slides.length;
  const slide = data.slides[current];
  const Layout = LAYOUT_MAP[slide.type] || BulletsSlide;

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  return (
    <div className="w-full max-w-5xl mx-auto select-none">
      {/* Slide canvas - 16:9 aspect ratio */}
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-500"
        style={{ aspectRatio: "16/9", background: theme.bg }}
      >
        <div key={current} className="w-full h-full animate-[fadeIn_0.4s_ease]">
          <Layout slide={slide} theme={theme} />
        </div>

        {/* slide counter */}
        <div
          className="absolute top-5 right-6 text-sm font-medium tracking-wide"
          style={{ fontFamily: theme.body, color: theme.subtext }}
        >
          {current + 1} / {total}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="p-3 rounded-full bg-gray-800 text-white disabled:opacity-30 hover:bg-gray-700 transition"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex gap-2">
          {data.slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}>
              <Circle
                size={8}
                fill={i === current ? "#5FD4D0" : "transparent"}
                stroke={i === current ? "#5FD4D0" : "#888"}
              />
            </button>
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={current === total - 1}
          className="p-3 rounded-full bg-gray-800 text-white disabled:opacity-30 hover:bg-gray-700 transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
