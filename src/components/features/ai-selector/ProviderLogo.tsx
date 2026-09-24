import { Sparkles, Zap } from 'lucide-react';
import type { AiProviderId } from '@/lib/ai/gateway';
import { cn } from '@/lib/utils/cn';

export function ProviderLogo({ provider, className }: { provider: AiProviderId; className?: string }) {
  const base = cn('h-5 w-5 shrink-0', className);

  if (provider === 'groq') {
    return (
      <span className={cn(base, 'inline-flex items-center justify-center rounded-full bg-violet-500 text-white')}>
        <Zap className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (provider === 'claude') {
    return (
      <svg className={base} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#D97757" />
        <path fill="#FFF6EA" d="M15.9 6.8 8.1 25.2h4.1l1.5-3.9h7.9l1.5 3.9h4.2L19.5 6.8h-3.6Zm-.9 11 2.6-6.7 2.6 6.7H15Z" />
        <path fill="#FFF6EA" opacity=".82" d="M7.7 14.2h16.7v3.2H7.7z" />
      </svg>
    );
  }

  if (provider === 'gpt') {
    return (
      <svg className={base} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#10A37F" />
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
          <path d="M16 5.8c2.3 0 4.2 1.4 5 3.4 2.1.3 3.8 2 4.1 4.1 1.6 1.4 2.1 3.8 1 5.8-1.1 2-3.3 2.9-5.4 2.4-1.3 1.7-3.5 2.4-5.5 1.7-1.9.9-4.3.5-5.8-1.2-1.5-1.6-1.7-4-.6-5.9-.7-2 .1-4.3 1.8-5.5.4-2.7 2.7-4.8 5.4-4.8Z" />
          <path d="M21 9.2 13.6 13.5v8.6M10.6 10.6l7.6 4.4 7-4M8.8 16.1l7.2 4.2 7.4-4.2M20.7 21.5v-8.4L13.3 8.8" />
        </g>
      </svg>
    );
  }

  if (provider === 'gemini') {
    return (
      <svg className={base} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="geminiLogoGradient" x1="6" x2="26" y1="26" y2="6" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A73E8" />
            <stop offset=".48" stopColor="#8E5CF7" />
            <stop offset="1" stopColor="#EA4335" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="#101828" />
        <path fill="url(#geminiLogoGradient)" d="M16 4.8c1.2 6.1 5.1 10 11.2 11.2C21.1 17.2 17.2 21.1 16 27.2 14.8 21.1 10.9 17.2 4.8 16 10.9 14.8 14.8 10.9 16 4.8Z" />
        <path fill="#fff" opacity=".85" d="M22.6 6.5c.4 2.1 1.8 3.5 3.9 3.9-2.1.4-3.5 1.8-3.9 3.9-.4-2.1-1.8-3.5-3.9-3.9 2.1-.4 3.5-1.8 3.9-3.9Z" />
      </svg>
    );
  }

  return <Sparkles className={base} />;
}
