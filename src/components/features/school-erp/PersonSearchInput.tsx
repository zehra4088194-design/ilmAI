'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Presentational half of the shared name-search pattern — pair with useNameSearch()
 * (src/lib/hooks/useNameSearch.ts). Reused across school/college people lists, admissions,
 * fee-defaulters, attendance registers, parent-linking approvals, etc. — see
 * CLAUDE_CODE_MASTER_PROMPT.md point 15.
 */
export function PersonSearchInput({
  value,
  onChange,
  placeholder = 'Search by name...',
  resultCount,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional "N found" hint shown next to the clear button once there's a query. */
  resultCount?: number;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border py-2 pr-16 pl-9 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
        {value && typeof resultCount === 'number' && (
          <span className="text-muted-foreground text-[11px] whitespace-nowrap">{resultCount} found</span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground rounded p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
