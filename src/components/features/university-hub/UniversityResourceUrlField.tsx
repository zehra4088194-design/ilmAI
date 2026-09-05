'use client';

// Lets an admin either paste a link (Drive, YouTube, a direct PDF URL) or upload a PDF straight
// from disk. An upload goes to /api/admin/resource-files with bucket=university, which routes it
// to the dedicated University Hub object storage bucket (ilmai-uni-bucket on B2 — see
// src/lib/storage/r2.ts) instead of the platform's primary bucket, and comes back with an
// r2://<bucket>/<key> URI that fills this same field — same shape createUniversityResource()
// already accepts via its plain "url" input, so no server-action changes were needed.
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function UniversityResourceUrlField({ defaultValue = '' }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    formData.set('type', 'pdf');
    formData.set('bucket', 'university');
    formData.set('scope', 'university');
    setUploading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/resource-files', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setUrl(data.uri);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-2">
      <Input
        name="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Link (PDF, YouTube, etc.) or upload a PDF below"
      />
      <Input
        type="file"
        accept="application/pdf"
        disabled={uploading}
        onChange={(event) => void uploadFile(event.target.files?.[0] || null)}
        className="text-xs"
      />
      {uploading && <p className="text-muted-foreground text-xs">Uploading to ilmai-uni-bucket...</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
