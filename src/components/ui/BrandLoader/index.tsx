import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function BrandLoader({ label = 'Loading...', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 text-center', className)}>
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
        <BookOpen className="h-8 w-8 text-white" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-cyan-400 animate-pulse" />
      </div>
      <div>
        <p className="font-bold">ilm <span className="text-violet-400">AI</span></p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((item) => (
          <span key={item} className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: `${item * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
