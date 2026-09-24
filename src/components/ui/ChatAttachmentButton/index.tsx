'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Matches CHAT_ATTACHMENT_MAX_BYTES / CHAT_ATTACHMENT_ALLOWED_TYPES in
// src/lib/storage/chat-attachments.ts — kept in sync manually since one is a client component and
// the other only ever runs server-side; a mismatch here just means a slightly later "too large"/
// "not allowed" error from the server instead of an earlier client-side one, never a security gap
// (the server re-validates everything regardless of what this picks).
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'application/pdf'];

/**
 * Paperclip button + hidden file input, shared across every chat's message composer (Study
 * Buddies, parent<->student, parent<->teacher/principal). Picking a file calls onSelect with it —
 * the caller owns uploading it (each chat sends via its own message-send endpoint so the
 * attachment rides along with the same POST as the message, not a separate round trip).
 */
export function ChatAttachmentButton({ onSelect, disabled }: { onSelect: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ''; // lets picking the same file twice in a row re-fire onChange
          if (!file) return;
          if (file.size > MAX_BYTES) {
            toast.error(`The file must not exceed ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`);
            return;
          }
          if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Only images and PDF files can be sent.');
            return;
          }
          onSelect(file);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Attach file"
        title="Attach file"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
}
