import { BookOpen } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in-0 duration-200">
      <div className="mb-5 flex items-center gap-3 rounded-lg border bg-card/80 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
          <BookOpen className="h-5 w-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-muted/70" />
        </div>
        <div className="hidden h-6 items-end gap-1 sm:flex">
          {[0, 1, 2, 3].map((item) => (
            <span
              key={item}
              className="h-5 w-1 rounded-full bg-violet-400/80 [animation:equalizer_.55s_ease-in-out_infinite_alternate]"
              style={{ animationDelay: `${item * 0.08}s` }}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="rounded-lg border bg-card/70 p-5">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="mt-5 h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-3 animate-pulse rounded bg-muted/80" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
