'use client';

import Link from 'next/link';
import { BookOpen, LogIn } from 'lucide-react';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
import { Button } from '@/components/ui/button';

export function PublicResourceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border/70 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span>ilm <span className="text-violet-400">AI</span></span>
          </Link>
          <Button asChild size="sm" variant="gradient">
            <Link href="/login?redirect=/library"><LogIn className="h-4 w-4" /> Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">{children}</main>
      <SideChatWidget />
    </div>
  );
}
