'use client';

import { getSuggestionsForSubject } from '@/lib/constants/subjectSuggestions';

interface SuggestionChipsProps {
  subjectName?: string | null;
  onSelect: (text: string) => void;
}

export function SuggestionChips({ subjectName, onSelect }: SuggestionChipsProps) {
  const suggestions = getSuggestionsForSubject(subjectName);

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md">
      {suggestions.map((suggestion) => (
        <button key={suggestion} type="button" onClick={() => onSelect(suggestion)}
          className="text-xs px-3 py-2 rounded-full glass border border-border/50 hover:border-violet-500/50 transition-colors">
          {suggestion}
        </button>
      ))}
    </div>
  );
}
