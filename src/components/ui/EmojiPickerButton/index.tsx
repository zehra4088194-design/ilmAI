'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';

// A curated, WhatsApp-style emoji set grouped by category — plain Unicode characters rendered by
// the OS/browser's own emoji font, so no image assets or npm emoji-data package are needed. Kept
// to the ones students/parents/teachers actually reach for in a study-app chat rather than the
// full ~3800-emoji Unicode set, which would make the picker unwieldy on a small chat input.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😉', '😎', '🤩', '🥳', '😇', '🙂', '🙃', '😅', '🤗'],
  },
  {
    label: 'Feelings',
    emojis: ['😢', '😭', '😡', '😱', '😴', '🥺', '😬', '🤔', '😐', '🙄', '😳', '🤯', '😤', '🥲', '😔', '😅'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙏', '🤝', '✌️', '🤞', '👌', '💪', '🙌', '👋', '🤙', '✋', '🫡', '🫶', '🤟'],
  },
  {
    label: 'Study',
    emojis: ['📚', '📖', '✏️', '📝', '🎯', '💡', '🧠', '⏰', '✅', '❌', '🔥', '⭐', '🏆', '📊', '🎓', '💯'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💯', '✨', '🎉', '🎊', '👀', '😮', '❗'],
  },
];

/**
 * WhatsApp-style emoji picker for chat inputs — a Smile icon that opens a grid of tappable
 * emojis; picking one calls `onSelect` with the character so the caller can insert it into
 * whatever text state backs its own input. Shared across every 1:1/group chat surface (Study
 * Buddies, parent<->student, parent<->teacher, parent<->principal) instead of each hand-rolling
 * its own.
 */
export function EmojiPickerButton({ onSelect, disabled }: { onSelect: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Add emoji"
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[85vw] bg-background p-2">
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-muted-foreground mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      // Deliberately stays open (like WhatsApp) so a student/parent can tap
                      // several emojis in a row without reopening the picker each time.
                    }}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-muted',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
