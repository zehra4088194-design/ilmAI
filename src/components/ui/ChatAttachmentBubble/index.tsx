'use client';

import { File, Download } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Attachment = {
  attachment_signed_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size_kb?: number | null;
};

function formatSize(kb?: number | null) {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fileExtension(name?: string | null) {
  const ext = name?.includes('.') ? name.split('.').pop() : null;
  return ext ? ext.slice(0, 4).toUpperCase() : 'FILE';
}

/**
 * Renders one message's attachment, if it has one — an inline tappable image preview for
 * image/*, or a WhatsApp-style file card (coloured type badge + name + size) for anything else
 * (PDF). The signed URL carries a forced Content-Disposition: attachment for every non-image type
 * (see resolveAttachmentSignedUrl), so clicking the card downloads the file with its original
 * name instead of navigating the tab to the raw storage URL. Shared by every chat bubble (Study
 * Buddies, parent<->student, parent<->teacher/principal) so the same look applies everywhere.
 * Returns null (renders nothing) when the message has no attachment, so callers can render it
 * unconditionally right after the message text.
 */
export function ChatAttachmentBubble({ message, mine }: { message: Attachment; mine?: boolean }) {
  if (!message.attachment_signed_url) return null;

  const isImage = message.attachment_type?.startsWith('image/');

  if (isImage) {
    return (
      <a href={message.attachment_signed_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, expires in an hour, not worth Next/Image's optimization pass */}
        <img
          src={message.attachment_signed_url}
          alt={message.attachment_name || 'Attachment'}
          className="max-h-56 max-w-full rounded-lg object-cover"
        />
      </a>
    );
  }

  const isPdf = message.attachment_type === 'application/pdf';

  return (
    <a
      href={message.attachment_signed_url}
      download={message.attachment_name || undefined}
      className={cn(
        'group mt-1.5 flex items-center gap-3 rounded-xl border p-2.5 text-sm transition-colors',
        mine ? 'border-white/25 bg-white/10 hover:bg-white/15' : 'border-border bg-background/70 hover:bg-background'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold',
          isPdf ? 'bg-red-500 text-white' : mine ? 'bg-white/20 text-white' : 'bg-violet-500/15 text-violet-500'
        )}
      >
        {isPdf ? 'PDF' : <File className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-tight">{message.attachment_name || 'File'}</span>
        <span className={cn('mt-0.5 flex items-center gap-1.5 text-[11px]', mine ? 'text-white/70' : 'text-muted-foreground')}>
          {!isPdf && <span>{fileExtension(message.attachment_name)}</span>}
          {message.attachment_size_kb ? <span>{formatSize(message.attachment_size_kb)}</span> : null}
        </span>
      </span>
      <Download
        className={cn(
          'h-4 w-4 shrink-0 transition-transform group-hover:translate-y-0.5',
          mine ? 'text-white/80' : 'text-muted-foreground'
        )}
      />
    </a>
  );
}
