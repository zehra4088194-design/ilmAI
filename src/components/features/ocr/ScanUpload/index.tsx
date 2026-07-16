'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, X, Check, AlertCircle, Sparkles, FileText, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface ScanUploadProps {
  onTextExtracted: (text: string) => void;
  trigger?: React.ReactNode;
}

type ScanState = 'idle' | 'preview' | 'scanning' | 'done' | 'error';

export function ScanUpload({ onTextExtracted, trigger }: ScanUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ScanState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [scanMode, setScanMode] = useState<'printed' | 'handwritten'>('printed');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const plan = settings.subscriptionPlans[tier];
  const printedLimit = plan.limits.ocrPrintedWeekly;
  const handwrittenLimit = plan.limits.ocrHandwrittenWeekly;
  const limitLabel = (value: number) => (value < 0 ? 'Unlimited' : String(value));

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Sirf image upload karo');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setState('preview');
  }, []);

  const handleScan = async () => {
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) return;
    setState('scanning');
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', scanMode);
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
    setSelectedFile(null);
    setExtractedText('');
    setErrorMsg('');
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <Camera className="h-4 w-4" /> Scan Question
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass border-border w-full max-w-md rounded-2xl border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  Scan & Extract Text
                </h3>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-muted-foreground mb-4 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
                {plan.name}: {limitLabel(printedLimit)} printed aur {limitLabel(handwrittenLimit)} handwritten
                scans/week.
              </p>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScanMode('printed')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    scanMode === 'printed'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <FileText className="h-3.5 w-3.5" /> Printed
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('handwritten')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    scanMode === 'handwritten'
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <PenLine className="h-3.5 w-3.5" /> Handwritten
                </button>
              </div>

              {state === 'idle' && (
                <div
                  className="border-border cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-violet-500/50"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                  <p className="mb-1 text-sm font-medium">Photo upload karo ya yahan drag karo</p>
                  <p className="text-muted-foreground text-xs">Question, notes, ya textbook page ki clear image</p>
                </div>
              )}

              {state === 'preview' && selectedFile && (
                <div>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="bg-muted mb-4 max-h-64 w-full rounded-lg object-contain"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setState('idle');
                        setPreviewUrl(null);
                        setSelectedFile(null);
                      }}
                    >
                      Change
                    </Button>
                    <Button variant="gradient" className="flex-1" onClick={handleScan}>
                      <Sparkles className="h-4 w-4" />
                      Extract Text
                    </Button>
                  </div>
                </div>
              )}

              {state === 'scanning' && (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-violet-400" />
                  <p className="text-sm font-medium">Text extract kar rahe hain...</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {scanMode === 'printed'
                      ? 'Printed OCR se process ho raha hai'
                      : 'Gemini Vision AI se process ho raha hai'}
                  </p>
                </div>
              )}

              {state === 'done' && (
                <div>
                  <div className="bg-muted/50 mb-4 max-h-48 overflow-y-auto rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{extractedText}</p>
                  </div>
                  {remaining !== null && remaining >= 0 && (
                    <p className="text-muted-foreground mb-3 text-xs">{remaining} scans is week baqi hain</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setState('idle');
                        setPreviewUrl(null);
                        setSelectedFile(null);
                      }}
                    >
                      Dobara Scan Karo
                    </Button>
                    <Button variant="gradient" className="flex-1" onClick={handleUseText}>
                      <Check className="h-4 w-4" />
                      Use This Text
                    </Button>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div className="py-6 text-center">
                  <AlertCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
                  <p className="mb-1 text-sm font-medium">Scan Fail Ho Gaya</p>
                  <p className="text-muted-foreground mb-4 text-xs">{errorMsg}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setState('idle');
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
