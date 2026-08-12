'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Shared name-search hook. Used everywhere a list/table needs "find this person by name" per
 * CLAUDE_CODE_MASTER_PROMPT.md point 15 — build one pattern and reuse it rather than ad hoc
 * per-page search. Debounced because typing fires this on every keystroke against an in-memory
 * array; there's no network round-trip to protect here, but the debounce keeps re-renders of large
 * tables (500+ rows) from happening on every keypress.
 *
 * @param items The full, already-fetched list to search within.
 * @param getSearchableText Extracts the text to match against for each item (e.g. full name, or
 *   `${name} ${rollNumber}` to also match roll numbers).
 * @param debounceMs Delay before the query actually filters the list. Default 150ms.
 */
export function useNameSearch<T>(items: T[], getSearchableText: (item: T) => string, debounceMs = 150) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const setQueryDebounced = (next: string) => {
    setQuery(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedQuery(next), debounceMs);
  };

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => getSearchableText(item).toLowerCase().includes(needle));
  }, [items, debouncedQuery, getSearchableText]);

  return { query, setQuery: setQueryDebounced, filtered, isFiltering: debouncedQuery.trim().length > 0 };
}
