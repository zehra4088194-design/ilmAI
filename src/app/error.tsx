'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Application error:', error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Kuch Ghalat Ho Gaya</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">Unexpected error aa gaya hai. Dobara try karo ya home page par jao.</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}><RotateCcw className="w-4 h-4" />Try Again</Button>
        <Button asChild variant="gradient"><Link href="/"><Home className="w-4 h-4" />Home</Link></Button>
      </div>
    </div>
  );
}
