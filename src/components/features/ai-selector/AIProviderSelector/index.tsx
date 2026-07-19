'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock, Sparkles } from 'lucide-react';
import { AI_PROVIDERS, MODEL_TIERS } from '@/lib/constants/ai-providers';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { ProviderLogo } from '@/components/features/ai-selector/ProviderLogo';

interface AIProviderSelectorProps {
  provider: AiProviderId;
  tier: ModelTier;
  onChange: (provider: AiProviderId, tier: ModelTier) => void;
  isFreeTier: boolean;
  userTier?: 'FREE' | 'PRO' | 'ELITE';
  compact?: boolean;
}

/**
 * Dropdown used everywhere an AI call is made (AI Tutor, Quiz/Flashcard generation,
 * Side Chat, Explain, etc). Free and Pro use the budget Assistant. Elite can
 * spend its capped premium-call allowance on other providers.
 */
export function AIProviderSelector({ provider, tier, onChange, isFreeTier, userTier = isFreeTier ? 'FREE' : 'PRO', compact = false }: AIProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

const activeProvider = AI_PROVIDERS.find((p) => p.id === provider) || AI_PROVIDERS[0]!;
const activeTier = MODEL_TIERS.find((t) => t.id === tier) || MODEL_TIERS[0]!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn('flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium', compact ? 'px-2 py-1' : 'px-3 py-1.5')}
      >
        <ProviderLogo provider={activeProvider.id} className="h-4 w-4" />
        <span>{activeProvider.label}</span>
        {provider !== 'groq' && <span className="text-muted-foreground">· {activeTier.label}</span>}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 glass rounded-xl border border-border shadow-xl p-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">AI Provider</p>
          {AI_PROVIDERS.map((p) => {
            const locked = userTier !== 'ELITE' && p.id !== 'groq';
            return (
              <button
                key={p.id}
                disabled={locked}
                onClick={() => { if (!locked) { onChange(p.id, p.id === 'groq' ? 'mini' : tier); if (p.id === 'groq') setOpen(false); } }}
                className={cn('w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm transition-colors', locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent', provider === p.id && 'bg-accent')}
              >
                <span className="flex items-center gap-2">
                  <ProviderLogo provider={p.id} />
                  {p.label}
                </span>
                {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </button>
            );
          })}

          {provider !== 'groq' && (
            <>
              <div className="h-px bg-border my-2" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">Model Size</p>
              {MODEL_TIERS.map((t) => {
                const eliteLocked = t.id === 'pro' && userTier !== 'ELITE';
                return (
                <button
                  key={t.id}
                  disabled={eliteLocked}
                  onClick={() => { if (!eliteLocked) { onChange(provider, t.id); setOpen(false); } }}
                  className={cn('w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors', eliteLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent', tier === t.id && 'bg-accent')}
                >
                  <span>{t.label}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {eliteLocked && <Lock className="h-3 w-3" />}
                    {eliteLocked ? 'Elite only' : t.description}
                  </span>
                </button>
                );
              })}
              {userTier === 'PRO' && (
                <Link href="/subscription" className="mt-1 flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <Sparkles className="w-3 h-3" />Upgrade to Elite to unlock the Pro model tier
                </Link>
              )}
            </>
          )}

          {userTier !== 'ELITE' && (
            <Link href="/subscription" className="mt-2 flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors">
              <Sparkles className="w-3 h-3" /> Unlock capped premium AI models with Elite
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
