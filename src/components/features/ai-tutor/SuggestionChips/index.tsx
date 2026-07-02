'use client';
const SUGGESTIONS = [
  'Newton ke 3 laws explain karo',
  'Quadratic equation kaise solve karte hain?',
  'Photosynthesis ka process kya hai?',
  'Chemical bonding ki types batao',
];
export function SuggestionChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md">
      {SUGGESTIONS.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          className="text-xs px-3 py-2 rounded-full glass border border-border/50 hover:border-violet-500/50 transition-colors">
          {s}
        </button>
      ))}
    </div>
  );
}
