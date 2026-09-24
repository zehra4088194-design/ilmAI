'use client';

import Link from 'next/link';
import { BookOpen, House, LibraryBig, LogIn } from 'lucide-react';
import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
import { Button } from '@/components/ui/button';
import { LandingFooter } from '@/components/features/landing/Footer';

export function PublicResourceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border/70 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span>
              ilm <span className="text-violet-400">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/">
                <House className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/library">
                <LibraryBig className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="gradient">
              <Link href="/login?redirect=/library">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">{children}</main>
      <LandingFooter />
      <SideChatWidget />
    </div>
  );
}
