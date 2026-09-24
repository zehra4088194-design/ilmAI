'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AI_PROVIDERS, MODEL_TIERS } from '@/lib/constants/ai-providers';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import { cn } from '@/lib/utils/cn';
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
 * Dropdown used wherever the app lets the user choose an AI model.
 * Production policy currently keeps normal text requests on Gemini Flash-Lite.
 * Tiny greetings are handled locally by the chat API before any provider call.
 */
export function AIProviderSelector({
  provider,
  tier,
  onChange,
  isFreeTier,
  userTier = isFreeTier ? 'FREE' : 'PRO',
  compact = false,
}: AIProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeProvider = AI_PROVIDERS.find((item) => item.id === provider) || AI_PROVIDERS[0]!;
  const activeTier = MODEL_TIERS.find((item) => item.id === tier) || MODEL_TIERS[0]!;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'border-border bg-muted/30 hover:bg-muted/50 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors',
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        )}
      >
        <ProviderLogo provider={activeProvider.id} className="h-4 w-4" />
        <span>{activeProvider.label}</span>
        <span className="text-muted-foreground">· {activeTier.label}</span>
        <ChevronDown className="text-muted-foreground h-3 w-3" />
      </button>

      {open && (
        <div className="glass border-border absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border p-2 shadow-xl">
          <p className="text-muted-foreground px-2 py-1 text-[10px] tracking-wide uppercase">AI Provider</p>
          {AI_PROVIDERS.map((item) => {
            const locked = !item.freeAvailable && userTier !== 'ELITE';
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (!locked) {
                    onChange(item.id, tier);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                  locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent',
                  provider === item.id && 'bg-accent'
                )}
              >
                <span className="flex items-center gap-2">
                  <ProviderLogo provider={item.id} />
                  {item.label}
                </span>
                {locked && <Lock className="text-muted-foreground h-3 w-3" />}
              </button>
            );
          })}

          <div className="bg-border my-2 h-px" />
          <p className="text-muted-foreground px-2 py-1 text-[10px] tracking-wide uppercase">Model Size</p>
          {MODEL_TIERS.map((item) => {
            const eliteLocked = item.id === 'pro' && userTier !== 'ELITE';
            return (
              <button
                key={item.id}
                type="button"
                disabled={eliteLocked}
                onClick={() => {
                  if (!eliteLocked) {
                    onChange(activeProvider.id, item.id);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors',
                  eliteLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent',
                  tier === item.id && 'bg-accent'
                )}
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  {eliteLocked && <Lock className="h-3 w-3" />}
                  {eliteLocked ? 'Elite only' : item.description}
                </span>
              </button>
            );
          })}

          {userTier === 'PRO' && (
            <Link
              href="/subscription"
              className="mt-1 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-2 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Sparkles className="h-3 w-3" />
              Upgrade to Elite for larger future model tiers
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
