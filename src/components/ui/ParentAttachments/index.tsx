'use client';
import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function formatFileSize(kb: number) {
  return kb < 1024 ? `${kb}KB` : `${(kb / 1024).toFixed(1)}MB`;
}

/**
 * Shared file attachments between a parent and their linked student — fee
 * receipts, notes, homework photos, report cards, etc. Used on both the
 * Parent Dashboard (per student card) and the student's Settings > Parent
 * Link tab, right next to ParentMessageThread. Files live in the private
 * `parent-attachments` Supabase Storage bucket and are only ever accessed
 * via short-lived signed URLs — nothing here is publicly listable.
 */
export function ParentAttachments({ linkId, currentUserId }: { linkId: string; currentUserId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/parent/attachments?linkId=${linkId}`)
      .then((r) => r.json())
      .then((json) => { if (json.status === 'success') setAttachments(json.data || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linkId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) { toast.error('File 10MB se bari nahi honi chahiye'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Sirf images ya PDF allowed hain'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('linkId', linkId);
      formData.append('file', file);

      const res = await fetch('/api/parent/attachments', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }

      setAttachments((prev) => [json.data, ...prev]);
      toast.success('File share ho gayi!');
    } catch {
      toast.error('Upload nahi hui, dobara try karo');
    } finally {
      setUploading(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Paperclip className="w-3.5 h-3.5" /> Files
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Shared Files
        </span>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-background/50">
        {loading && <p className="text-xs text-muted-foreground text-center mt-2">Loading...</p>}
        {!loading && attachments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">Koi file share nahi hui abhi</p>
        )}
        {attachments.map((a) => (
          <a
            key={a.id}
            href={a.signed_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-muted/50 transition-colors',
              a.sender_id === currentUserId && 'bg-violet-500/5'
            )}
          >
            {a.file_type.startsWith('image/') && a.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.signed_url}
                alt={a.file_name}
                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-xs">{a.file_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(a.file_size_kb)} &middot; {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>

      <div className="p-2 border-t border-border">
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
          <Upload className="w-3.5 h-3.5" /> Upload File
        </Button>
      </div>
    </div>
  );
}
