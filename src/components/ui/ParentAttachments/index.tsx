'use client';
import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Attachment {
  id: string;
  link_id: string;
  sender_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size_kb: number;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function formatFileSize(kb: number) {
  return kb < 1024 ? `${kb}KB` : `${(kb / 1024).toFixed(1)}MB`;
}

/**
 * Shared file attachments between a parent and their linked student — fee
 * receipts, notes, homework photos, report cards, etc. Used on both the
 * Parent Dashboard (per student card) and the student's Settings > Parent
 * Link tab, right next to ParentMessageThread. Files live in private R2
 * storage (with legacy Supabase Storage support) and are only accessed
 * through an authenticated API route.
 */
export function ParentAttachments({
  linkId,
  currentUserId,
  autoOpen = false,
}: {
  linkId: string;
  currentUserId: string;
  autoOpen?: boolean;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [open, setOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const load = () => {
    setLoading(true);
    fetch(`/api/parent/attachments?linkId=${linkId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'success') setAttachments(json.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linkId]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`parent_attachments:${linkId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_attachments', filter: `link_id=eq.${linkId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, open, supabase]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Files must be 4 MB or smaller.');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only images and PDFs are allowed.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('linkId', linkId);
      formData.append('file', file);

      const res = await fetch('/api/parent/attachments', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }

      setAttachments((prev) => [json.data, ...prev]);
      toast.success('File shared.');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Paperclip className="h-3.5 w-3.5" /> Files
      </Button>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="border-border bg-muted/30 flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Paperclip className="h-3.5 w-3.5" /> Shared Files
        </span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">
          Close
        </button>
      </div>

      <div className="bg-background/50 max-h-64 space-y-2 overflow-y-auto p-3">
        {loading && <p className="text-muted-foreground mt-2 text-center text-xs">Loading...</p>}
        {!loading && attachments.length === 0 && (
          <p className="text-muted-foreground mt-4 text-center text-xs">No files have been shared yet.</p>
        )}
        {attachments.map((a) => (
          <a
            key={a.id}
            href={a.signed_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'hover:bg-muted/50 flex items-center gap-2.5 rounded-lg p-2 text-sm transition-colors',
              a.sender_id === currentUserId && 'bg-violet-500/5'
            )}
          >
            {a.file_type.startsWith('image/') && a.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.signed_url}
                alt={a.file_name}
                className="border-border h-10 w-10 shrink-0 rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <FileText className="h-5 w-5 text-red-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{a.file_name}</p>
              <p className="text-muted-foreground text-[10px]">
                {formatFileSize(a.file_size_kb)} &middot; {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            <Download className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          </a>
        ))}
      </div>

      <div className="border-border border-t p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
        >
          <Upload className="h-3.5 w-3.5" /> Upload File
        </Button>
        <p className="text-muted-foreground mt-1.5 text-center text-[10px]">
          Shared files remain available in secure archive storage.
        </p>
      </div>
    </div>
  );
}
