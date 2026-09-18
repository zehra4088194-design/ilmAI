'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  Check,
  FileQuestion,
  GraduationCap,
  Library,
  MessageCircle,
  Settings,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';

type TourStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOUR_VERSION = 'v1';

const TOUR_COPY: Record<string, TourStep[]> = {
  student: [
    {
      id: 'progress',
      selector: 'a[href="/progress"]',
      title: 'Track your progress',
      description: 'Yahan tum apni study progress, streak, performance aur improvement ko ek jagah dekh sakte ho.',
      icon: BarChart3,
    },
    {
      id: 'library',
      selector: 'a[href="/library"]',
      title: 'Your study library',
      description: 'Books, notes, past papers aur doosre study resources ko quickly yahin se access karo.',
      icon: Library,
    },
    {
      id: 'buddies',
      selector: 'a[href="/student-chat"]',
      title: 'Study Buddies',
      description: 'Classmates aur study partners ke saath connect ho kar questions, ideas aur study help share karo.',
      icon: MessageCircle,
    },
    {
      id: 'games',
      selector: 'a[href="/games"]',
      title: 'Learn through games',
      description: 'Practice ko thora fun banao — learning games aur challenges ke through revise karo.',
      icon: Trophy,
    },
    {
      id: 'scan',
      selector: 'a[href="/scan"]',
      title: 'AI Scan & Solve',
      description: 'Question ki photo lo aur ilm AI usay samajh kar solve/explain karne mein help karega.',
      icon: Camera,
    },
  ],
  university: [
    {
      id: 'hub',
      selector: 'a[href="/university-hub"]',
      title: 'Your University Hub',
      description: 'Apne program, year, subjects aur university resources ko ek central place se manage karo.',
      icon: GraduationCap,
    },
    {
      id: 'tutor',
      selector: 'a[href="/ai-tutor"]',
      title: 'AI Tutor',
      description: 'Concept samajhne, follow-up questions poochne aur topics ko step-by-step study karne ke liye use karo.',
      icon: Brain,
    },
    {
      id: 'buddies',
      selector: 'a[href="/student-chat"]',
      title: 'Study Buddies',
      description: 'Study partners ke saath discussion, collaboration aur academic help ke liye connect ho jao.',
      icon: Users,
    },
    {
      id: 'scan',
      selector: 'a[href="/scan"]',
      title: 'AI Scan & Solve',
      description: 'Lecture sheet, assignment ya question ki image scan karke AI se explanation lo.',
      icon: Camera,
    },
    {
      id: 'progress',
      selector: 'a[href="/progress"]',
      title: 'See your progress',
      description: 'Apni study activity, streaks aur performance ko track karte raho taake pata rahe kahan improvement chahiye.',
      icon: BarChart3,
    },
  ],
  teacher: [
    {
      id: 'tests',
      selector: 'a[href="/teacher/tests"]',
      title: 'Test Paper Studio',
      description: 'Students ke liye tests aur question papers prepare, manage aur share karne ke tools yahan milte hain.',
      icon: FileQuestion,
    },
    {
      id: 'library',
      selector: 'a[href="/library"]',
      title: 'Resource Library',
      description: 'Teaching ke liye available study resources aur classroom material ko quickly browse karo.',
      icon: Library,
    },
    {
      id: 'messages',
      selector: 'a[href="/messages"]',
      title: 'Stay connected',
      description: 'Students aur relevant users ke saath messages ke through academic communication rakho.',
      icon: MessageCircle,
    },
    {
      id: 'subscription',
      selector: 'a[href="/subscription"]',
      title: 'Plan & access',
      description: 'Apne current plan aur available features ko yahan se check aur manage karo.',
      icon: Sparkles,
    },
    {
      id: 'settings',
      selector: 'a[href="/settings"]',
      title: 'Your settings',
      description: 'Profile, preferences aur account settings ko apni zarurat ke mutabiq control karo.',
      icon: Settings,
    },
  ],
  principal: [
    {
      id: 'dashboard',
      selector: 'a[href="/school-admin"]',
      title: 'Institution dashboard',
      description: 'School ka overall administrative overview aur key information yahan se manage hoti hai.',
      icon: BarChart3,
    },
    {
      id: 'teachers',
      selector: 'a[href="/school-admin/teachers"]',
      title: 'Manage teachers',
      description: 'Teaching staff ko manage, review aur institution workflow ke saath organize karo.',
      icon: GraduationCap,
    },
    {
      id: 'classes',
      selector: 'a[href="/school-admin/classes"]',
      title: 'Manage classes',
      description: 'Classes aur academic structure ko organize karne ke liye ye section use karo.',
      icon: BookOpen,
    },
    {
      id: 'students',
      selector: 'a[href="/school-admin/students"]',
      title: 'Student management',
      description: 'Students ki records aur institution-side management ko yahan handle karo.',
      icon: Users,
    },
    {
      id: 'invoices',
      selector: 'a[href="/school-admin/invoices"]',
      title: 'Fees & invoices',
      description: 'Institution ke fees aur invoice related records ko yahan monitor aur manage karo.',
      icon: FileQuestion,
    },
  ],
  parent: [
    {
      id: 'children',
      selector: 'a[href="/parent"]',
      title: 'Your children',
      description: 'Apne linked students ko ek jagah se dekho aur unki learning activity par nazar rakho.',
      icon: Users,
    },
    {
      id: 'reports',
      selector: 'a[href="/parent/analytics"]',
      title: 'Performance & reports',
      description: 'Progress, performance aur reports ko detail mein review karne ke liye ye section hai.',
      icon: BarChart3,
    },
    {
      id: 'messages',
      selector: 'a[href="/messages"]',
      title: 'Messages',
      description: 'Teachers aur relevant people ke saath academic communication yahan se manage karo.',
      icon: MessageCircle,
    },
    {
      id: 'calls',
      selector: 'a[href="/calls"]',
      title: 'Calls',
      description: 'Available calling features ke through connected raho jab direct conversation ki zarurat ho.',
      icon: MessageCircle,
    },
    {
      id: 'settings',
      selector: 'a[href="/settings"]',
      title: 'Settings',
      description: 'Account aur preferences ko yahan se manage karo.',
      icon: Settings,
    },
  ],
  default: [
    {
      id: 'dashboard',
      selector: 'a[href="/dashboard"]',
      title: 'Your dashboard',
      description: 'Ye tumhara main home base hai — important study information yahan quickly milti rahegi.',
      icon: BookOpen,
    },
    {
      id: 'library',
      selector: 'a[href="/library"]',
      title: 'Library',
      description: 'Study resources aur learning material ko yahan se access karo.',
      icon: Library,
    },
    {
      id: 'scan',
      selector: 'a[href="/scan"]',
      title: 'AI Scan & Solve',
      description: 'Question ki photo scan karo aur AI se help lo.',
      icon: Camera,
    },
    {
      id: 'progress',
      selector: 'a[href="/progress"]',
      title: 'Progress',
      description: 'Apni learning aur study progress ko track karo.',
      icon: BarChart3,
    },
    {
      id: 'settings',
      selector: 'a[href="/settings"]',
      title: 'Settings',
      description: 'Profile aur account preferences yahan se manage karo.',
      icon: Settings,
    },
  ],
};

function getTourKey(role?: string, educationLevel?: string | null) {
  if (role === 'student' && educationLevel === 'university') return 'university';
  if (role === 'student') return 'student';
  if (role && TOUR_COPY[role]) return role;
  return 'default';
}

function findVisibleElement(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }) ?? null
  );
}

export function FeatureTour({
  mobileMenuOpen,
  onMobileMenuChange,
}: {
  mobileMenuOpen: boolean;
  onMobileMenuChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardStyle, setCardStyle] = useState<CSSProperties>({});
  const openedMobileMenuByTour = useRef(false);

  const steps = useMemo(
    () => TOUR_COPY[getTourKey(user?.role, user?.educationLevel)] ?? TOUR_COPY.default,
    [user?.educationLevel, user?.role]
  );
  const step = steps[stepIndex] ?? steps[steps.length - 1];
  const Icon = step?.icon;

  const storageKey = user?.id ? `ilm-ai-feature-tour:${TOUR_VERSION}:${user.id}` : null;

  const closeTour = useCallback(() => {
    if (storageKey) window.localStorage.setItem(storageKey, 'completed');
    setOpen(false);
    setTargetRect(null);
    if (openedMobileMenuByTour.current) {
      onMobileMenuChange(false);
      openedMobileMenuByTour.current = false;
    }
  }, [onMobileMenuChange, storageKey]);

  useEffect(() => {
    if (!user?.id || !storageKey || typeof window === 'undefined') return;
    if (window.localStorage.getItem(storageKey) === 'completed') return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (!open || !step || typeof window === 'undefined') return;

    const isMobile = window.innerWidth < 1024;
    let cancelled = false;
    let retryTimer: number | undefined;

    const updatePosition = (shouldScroll = false) => {
      if (cancelled) return;

      const target = findVisibleElement(step.selector);
      if (!target && isMobile && !mobileMenuOpen) {
        openedMobileMenuByTour.current = true;
        onMobileMenuChange(true);
        retryTimer = window.setTimeout(updatePosition, 120);
        return;
      }

      if (target) {
        if (shouldScroll) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        const rect = target.getBoundingClientRect();
        const padding = 6;
        const nextRect = {
          top: Math.max(6, rect.top - padding),
          left: Math.max(6, rect.left - padding),
          width: Math.min(window.innerWidth - 12, rect.width + padding * 2),
          height: Math.min(window.innerHeight - 12, rect.height + padding * 2),
        };
        setTargetRect(nextRect);

        const cardWidth = Math.min(420, window.innerWidth - 32);
        const cardHeight = 235;
        const gap = 20;
        let left = Math.max(16, (window.innerWidth - cardWidth) / 2);
        let top = Math.max(16, window.innerHeight - cardHeight - 24);

        if (window.innerWidth >= 768) {
          if (nextRect.left + nextRect.width + gap + cardWidth <= window.innerWidth) {
            left = nextRect.left + nextRect.width + gap;
            top = Math.min(Math.max(76, nextRect.top), window.innerHeight - cardHeight - 16);
          } else if (nextRect.left - gap - cardWidth >= 0) {
            left = nextRect.left - gap - cardWidth;
            top = Math.min(Math.max(76, nextRect.top), window.innerHeight - cardHeight - 16);
          }
        }

        setCardStyle({ left, top, width: cardWidth });
        return;
      }

      setTargetRect(null);
      const cardWidth = Math.min(420, window.innerWidth - 32);
      setCardStyle({
        left: Math.max(16, (window.innerWidth - cardWidth) / 2),
        top: Math.max(90, window.innerHeight / 2 - 115),
        width: cardWidth,
      });
    };

    const frame = window.requestAnimationFrame(() => updatePosition(true));
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [mobileMenuOpen, onMobileMenuChange, open, step]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTour();
      if (event.key === 'ArrowRight') setStepIndex((index) => Math.min(index + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setStepIndex((index) => Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTour, open, steps.length]);

  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(Math.max(0, steps.length - 1));
  }, [stepIndex, steps.length]);

  if (!open || !step || !Icon) return null;

  const next = () => {
    if (stepIndex === steps.length - 1) {
      closeTour();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  return (
    <div className="fixed inset-0 z-[220]" aria-label="ilm AI feature tour">
      <div className="absolute inset-x-0 top-0 bg-black/55 backdrop-blur-[1px]" style={{ height: targetRect ? targetRect.top : '100%' }} />

      {targetRect && (
        <>
          <div
            className="absolute left-0 bg-black/55 backdrop-blur-[1px]"
            style={{ top: targetRect.top, width: targetRect.left, height: targetRect.height }}
          />
          <div
            className="absolute right-0 bg-black/55 backdrop-blur-[1px]"
            style={{
              top: targetRect.top,
              left: targetRect.left + targetRect.width,
              height: targetRect.height,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-black/55 backdrop-blur-[1px]"
            style={{ top: targetRect.top + targetRect.height }}
          />
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-violet-300/90 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_28px_rgba(139,92,246,0.45)]"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        </>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ilm-ai-tour-title"
        className="absolute rounded-2xl border border-white/15 bg-background/95 p-5 text-foreground shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={cardStyle}
      >
        <button
          type="button"
          onClick={closeTour}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Skip tour"
          title="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
              Welcome to ilm AI · {stepIndex + 1} of {steps.length}
            </p>
            <h2 id="ilm-ai-tour-title" className="mt-1 text-lg font-bold leading-tight">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-sm leading-6">{step.description}</p>

        <div className="mt-5 flex items-center gap-1.5" aria-label="Tour progress">
          {steps.map((item, index) => (
            <span
              key={item.id}
              className={
                'h-1.5 rounded-full transition-all ' +
                (index === stepIndex ? 'w-8 bg-violet-500' : index < stepIndex ? 'w-4 bg-violet-300' : 'w-4 bg-muted')
              }
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeTour}
            className="text-muted-foreground rounded-lg px-2 py-2 text-sm font-medium transition hover:bg-muted hover:text-foreground"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                className="border-border rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110"
            >
              {stepIndex === steps.length - 1 ? (
                <>
                  Done <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
