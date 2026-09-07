'use client';

import { FileText, Download } from 'lucide-react';

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

/**
 * Renders one message's attachment, if it has one — an inline tappable image preview for
 * image/*, or a small file card (name + size + download) for anything else (PDF). Shared by
 * every chat bubble (Study Buddies, parent<->student, parent<->teacher/principal) so the same
 * look applies everywhere. Returns null (renders nothing) when the message has no attachment, so
 * callers can render it unconditionally right after the message text.
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

  return (
    <a
      href={message.attachment_signed_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${
        mine ? 'border-white/25 bg-white/10' : 'border-border bg-background/60'
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-medium">{message.attachment_name || 'File'}</span>
      {message.attachment_size_kb ? <span className="shrink-0 opacity-70">{formatSize(message.attachment_size_kb)}</span> : null}
      <Download className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
