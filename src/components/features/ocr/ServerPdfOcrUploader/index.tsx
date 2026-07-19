'use client';

import { useState } from 'react';
import { Clipboard, FileText, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface ServerPdfOcrUploaderProps {
  onTextExtracted?: (text: string) => void;
}

export function ServerPdfOcrUploader({ onTextExtracted }: ServerPdfOcrUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  async function processPdf() {
    if (!file) return;

    setLoading(true);
    setText('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pdf-extract', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.status === 'error') {
        toast.error(json.error || 'PDF OCR fail ho gaya');
        return;
      }

      const extracted = String(json.data?.text || '').trim();
      setText(extracted);
      onTextExtracted?.(extracted);
      toast.success(json.data?.usedOcr ? 'PDF OCR complete ho gaya' : 'PDF text extract ho gaya');
    } catch {
      toast.error('The PDF could not be processed.');
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Extracted text copy ho gaya');
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <label className="bg-muted/20 hover:bg-muted/30 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors">
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <UploadCloud className="mb-3 h-9 w-9 text-violet-400" />
          <p className="font-semibold">Upload PDF for Server OCR</p>
          <p className="text-muted-foreground mt-2 text-sm">
            {file ? file.name : 'Free OCR: select a PDF up to 900 KB and 3 pages.'}
          </p>
        </label>

        <Button variant="gradient" onClick={processPdf} disabled={!file || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? 'Extracting text...' : 'Extract Text'}
        </Button>

        {loading && (
          <div className="bg-muted/20 text-muted-foreground flex items-center gap-3 rounded-xl border p-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            Server PDF OCR is running. Scanned pages may take a little while.
          </div>
        )}

        {text && (
          <div className="bg-background rounded-xl border">
            <div className="flex items-center justify-between gap-3 border-b p-3">
              <p className="text-sm font-semibold">Extracted Text</p>
              <Button variant="outline" size="sm" onClick={copyText}>
                <Clipboard className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <pre className="text-muted-foreground max-h-96 overflow-auto p-4 text-sm leading-6 whitespace-pre-wrap">
              {text}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
