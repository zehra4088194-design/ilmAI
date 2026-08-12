'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PersonSearchInput } from './PersonSearchInput';
import { useNameSearch } from '@/lib/hooks/useNameSearch';

type MembershipRow = {
  id: string;
  member_role: string;
  designation: string | null;
  status: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

/**
 * Client-side searchable directory table. Renders the school/college People roster with a
 * name-search box and a phone-number column (the master prompt's canonical example of where
 * name-search + visible phone numbers are needed — see point 15 / Part 4.2).
 */
export function PeopleDirectoryTable({ memberships }: { memberships: MembershipRow[] }) {
  const getSearchableText = useCallback(
    (item: MembershipRow) => `${item.profiles?.full_name || ''} ${item.profiles?.email || ''}`,
    []
  );
  const { query, setQuery, filtered, isFiltering } = useNameSearch(memberships, getSearchableText);

  return (
    <div className="space-y-4">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search people by name or email..."
        resultCount={isFiltering ? filtered.length : undefined}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Designation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{item.profiles?.full_name}</td>
                <td>{item.profiles?.email}</td>
                <td>{item.profiles?.phone || '-'}</td>
                <td className="capitalize">{item.member_role}</td>
                <td>{item.designation || '-'}</td>
                <td>
                  <Badge variant={item.status === 'active' ? 'secondary' : 'outline'}>{item.status}</Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground py-6 text-center">
                  No matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
