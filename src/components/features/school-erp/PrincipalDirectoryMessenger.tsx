'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { Building2, CheckCircle2, MapPin, Search, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { sendPrincipalMessage } from '@/lib/institution-directory/actions';

type DirectoryResult = {
  institutionType: 'school' | 'college';
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  campuses: Array<{ id: string; name: string }>;
};

const INITIAL_STATE = { success: false, message: '' };

/**
 * Owner-requested feature (not in the original master prompt): a principal searches any other
 * school/college by name, picks a campus if that institution has more than one, and sends a direct
 * in-app message to its leadership. Lives on the Communication page alongside the existing
 * within-org "School inbox".
 */
export function PrincipalDirectoryMessenger() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DirectoryResult | null>(null);
  const [campusId, setCampusId] = useState('');
  const [state, formAction, pending] = useActionState(sendPrincipalMessage, INITIAL_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/school-admin/directory/search?q=${encodeURIComponent(query.trim())}`);
        const json = await response.json();
        setResults(json?.data?.results || []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectInstitution = (result: DirectoryResult) => {
    setSelected(result);
    setCampusId(result.campuses.length === 1 ? result.campuses[0]!.id : '');
    setResults([]);
    setQuery('');
  };

  const reset = () => {
    setSelected(null);
    setCampusId('');
  };

  // Reset the picker after a successful send so the form doesn't linger on "message sent" forever.
  useEffect(() => {
    if (state.success) {
      const handle = setTimeout(reset, 1200);
      return () => clearTimeout(handle);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      {!selected ? (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search another school or college by name..."
            className="border-input bg-background h-10 w-full rounded-lg border py-2 pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          {(searching || results.length > 0) && (
            <div className="border-border bg-card absolute z-10 mt-1 w-full space-y-1 rounded-lg border p-1.5 shadow-lg">
              {searching && <p className="text-muted-foreground p-2 text-xs">Searching...</p>}
              {!searching &&
                results.map((result) => (
                  <button
                    key={`${result.institutionType}-${result.id}`}
                    type="button"
                    onClick={() => selectInstitution(result)}
                    className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md p-2 text-left"
                  >
                    <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      {result.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={result.logoUrl} alt={result.name} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="text-muted-foreground h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{result.name}</span>
                      <span className="text-muted-foreground text-[11px] capitalize">{result.institutionType}</span>
                    </span>
                  </button>
                ))}
              {!searching && !results.length && query.trim().length >= 2 && (
                <p className="text-muted-foreground p-2 text-xs">No matching institutions found.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {selected.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.logoUrl} alt={selected.name} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="text-muted-foreground h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold">{selected.name}</p>
                <p className="text-muted-foreground text-[11px] capitalize">{selected.institutionType}</p>
              </div>
            </div>
            <button type="button" onClick={reset} aria-label="Choose a different institution" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {selected.campuses.length > 1 && (
            <label className="block space-y-1 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Which campus?
              </span>
              <select
                value={campusId}
                onChange={(event) => setCampusId(event.target.value)}
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                required
              >
                <option value="">Select a campus</option>
                {selected.campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="recipient_institution_type" value={selected.institutionType} />
            <input type="hidden" name="recipient_organization_id" value={selected.id} />
            <input type="hidden" name="recipient_campus_id" value={campusId} />
            <Input name="subject" placeholder="Subject" required maxLength={200} />
            <Textarea name="body" placeholder="Message" rows={4} required maxLength={4000} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending || (selected.campuses.length > 1 && !campusId)}>
                {pending ? 'Sending...' : (
                  <>
                    <Send className="h-4 w-4" />
                    Send message
                  </>
                )}
              </Button>
              {state.message && (
                <span className={`flex items-center gap-1.5 text-xs ${state.success ? 'text-emerald-600' : 'text-destructive'}`}>
                  {state.success && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {state.message}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
