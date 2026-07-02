'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface ScanUploadProps {
  onTextExtracted: (text: string) => void;
  trigger?: React.ReactNode;
}

type ScanState = 'idle' | 'preview' | 'scanning' | 'done' | 'error';

export function ScanUpload({ onTextExtracted, trigger }: ScanUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ScanState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const isFree = user?.subscriptionTier === 'FREE';

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Sirf images allowed hain (JPG, PNG, WEBP)');
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setState('preview');
  }, []);

  const handleScan = async () => {
    if (!fileInputRef.current?.files?.[0]) return;
    setState('scanning');
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', fileInputRef.current.files[0]);
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.status === 'error') {
        setErrorMsg(json.error);
        setState('error');
        return;
      }
      setExtractedText(json.data.text);
      setRemaining(json.data.remaining);
      setState('done');
    } catch {
      setErrorMsg('Kuch ghalat ho gaya. Internet check karo aur dobara try karo.');
      setState('error');
    }
  };

  const handleUseText = () => {
    onTextExtracted(extractedText);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setState('idle');
    setPreviewUrl(null);
    setExtractedText('');
    setErrorMsg('');
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <Camera className="w-4 h-4" /> Scan Question
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" />Scan & Extract Text</h3>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              {isFree && (
                <p className="text-xs text-muted-foreground mb-4 bg-amber-500/10 text-amber-500 rounded-lg px-3 py-2">
                  Free plan: roz 5 scans milte hain. Pro plan mein unlimited + better accuracy!
                </p>
              )}

              {state === 'idle' && (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Photo upload karo ya yahan drag karo</p>
                  <p className="text-xs text-muted-foreground">Question, notes, ya textbook page ki photo</p>
                </div>
              )}

              {state === 'preview' && previewUrl && (
                <div>
                  <img src={previewUrl} alt="Preview" className="w-full rounded-lg mb-4 max-h-64 object-contain bg-muted" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setState('idle'); setPreviewUrl(null); }}>Change</Button>
                    <Button variant="gradient" className="flex-1" onClick={handleScan}><Sparkles className="w-4 h-4" />Extract Text</Button>
                  </div>
                </div>
              )}

              {state === 'scanning' && (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-violet-400 animate-spin" />
                  <p className="text-sm font-medium">Text extract kar rahe hain...</p>
                  <p className="text-xs text-muted-foreground mt-1">{isFree ? 'OCR.space se process ho raha hai' : 'Gemini Vision AI se process ho raha hai'}</p>
                </div>
              )}

              {state === 'done' && (
                <div>
                  <div className="bg-muted/50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{extractedText}</p>
                  </div>
                  {remaining !== null && remaining >= 0 && (
                    <p className="text-xs text-muted-foreground mb-3">{remaining} scans baqi hain aaj ke liye</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setState('idle'); setPreviewUrl(null); }}>Dobara Scan Karo</Button>
                    <Button variant="gradient" className="flex-1" onClick={handleUseText}><Check className="w-4 h-4" />Use This Text</Button>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div className="py-6 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
                  <p className="text-sm font-medium mb-1">Scan Fail Ho Gaya</p>
                  <p className="text-xs text-muted-foreground mb-4">{errorMsg}</p>
                  <Button variant="outline" onClick={() => { setState('idle'); setPreviewUrl(null); }}>Try Again</Button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
