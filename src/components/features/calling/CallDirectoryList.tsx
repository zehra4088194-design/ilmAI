'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { CallButton } from './CallButton';
import type { CallDirectoryEntry, InstitutionType } from '@/lib/calling/types';

/**
 * Searchable "who can I call" list for the student/parent portal (and anywhere else a full admin
 * People table would be overkill) — the calling counterpart of PeopleDirectoryTable, but backed by
 * the narrower school_call_directory/college_call_directory RPC so a student can see classmates
 * and staff by name without needing the People-page permission grant.
 */
export function CallDirectoryList({
  institutionType,
  organizationId,
  entries,
}: {
  institutionType: InstitutionType;
  organizationId: string;
  entries: CallDirectoryEntry[];
}) {
  const getSearchableText = useCallback((item: CallDirectoryEntry) => item.full_name || '', []);
  const { query, setQuery, filtered, isFiltering } = useNameSearch(entries, getSearchableText);

  return (
    <div className="space-y-3">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search people to call..."
        resultCount={isFiltering ? filtered.length : undefined}
      />
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {filtered.map((item) => (
          <div key={item.profile_id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {item.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatar_url} alt={item.full_name || ''} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold">{(item.full_name || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.full_name || 'Member'}</span>
                <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">
                  {item.member_role}
                </Badge>
              </span>
            </div>
            <CallButton
              institutionType={institutionType}
              organizationId={organizationId}
              target={{ userId: item.profile_id, name: item.full_name || 'Member', avatarUrl: item.avatar_url }}
            />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground py-6 text-center text-sm">No matches.</p>}
      </div>
    </div>
  );
}
