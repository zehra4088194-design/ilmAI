'use client';

import { useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { CallButton } from './CallButton';
import type { CallDirectoryEntry, InstitutionType } from '@/lib/calling/types';

const ROLE_ORDER = ['student', 'teacher', 'staff', 'admin', 'owner', 'principal', 'parent'];

function roleLabel(role: string): string {
  return role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Searchable, alphabetically arranged directory with consistent contact cards. */
export function CallDirectoryList({
  entries,
}: {
  institutionType: InstitutionType;
  organizationId: string;
  entries: CallDirectoryEntry[];
}) {
  const getSearchableText = useCallback(
    (item: CallDirectoryEntry) => `${item.full_name || ''} ${item.member_role || ''} ${item.phone || ''}`,
    []
  );
  const { query, setQuery, filtered, isFiltering } = useNameSearch(entries, getSearchableText);

  const groups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const roleA = (a.member_role || 'other').toLowerCase();
      const roleB = (b.member_role || 'other').toLowerCase();
      const indexA = ROLE_ORDER.indexOf(roleA);
      const indexB = ROLE_ORDER.indexOf(roleB);
      const orderA = indexA === -1 ? ROLE_ORDER.length : indexA;
      const orderB = indexB === -1 ? ROLE_ORDER.length : indexB;
      return orderA - orderB ||
        roleA.localeCompare(roleB) ||
        (a.full_name || '').localeCompare(b.full_name || '');
    });
    const map = new Map<string, CallDirectoryEntry[]>();
    for (const entry of sorted) {
      const role = (entry.member_role || 'other').toLowerCase();
      map.set(role, [...(map.get(role) || []), entry]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-5">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search people by name, role, or phone..."
        resultCount={isFiltering ? filtered.length : undefined}
      />

      {groups.length > 0 ? groups.map(([role, people]) => (
        <section key={role} className="space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold">{roleLabel(role)}</h3>
            <Badge variant="secondary">{people.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((item) => (
              <article
                key={item.profile_id}
                className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30"
              >
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar_url}
                      alt={item.full_name || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {(item.full_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.full_name || 'Member'}</p>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {item.phone || 'Phone number required'}
                  </p>
                </div>
                <CallButton
                  target={{
                    userId: item.profile_id,
                    name: item.full_name || 'Member',
                    avatarUrl: item.avatar_url,
                    phone: item.phone,
                  }}
                />
              </article>
            ))}
          </div>
        </section>
      )) : (
        <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          {isFiltering ? 'No people match your search.' : 'No contacts are available yet.'}
        </p>
      )}
    </div>
  );
}
