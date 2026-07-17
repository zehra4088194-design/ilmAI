'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, QrCode, ShieldCheck, X } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

function extractInviteCode(value: string) {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    const code = parsed.searchParams.get('code');
    if (code) return code.trim().toUpperCase();
  } catch {
    // Raw invite codes are valid QR payloads too.
  }
  return trimmed.match(/SV-[A-Z0-9]{4,12}/i)?.[0]?.toUpperCase() || trimmed.toUpperCase();
}

export function ParentQrScanner({ onLinked }: { onLinked?: (linkId?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const onLinkedRef = useRef(onLinked);

  useEffect(() => {
    onLinkedRef.current = onLinked;
  }, [onLinked]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    handledRef.current = false;
    setStarting(true);
    setError(null);

    Promise.all([import('@zxing/browser'), import('@zxing/library')])
      .then(async ([{ BrowserQRCodeReader }, { BarcodeFormat, DecodeHintType }]) => {
        if (!active || !videoRef.current) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserQRCodeReader(hints, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 500,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, _scanError, scannerControls) => {
            controlsRef.current = scannerControls;
            if (!result || handledRef.current) return;
            handledRef.current = true;
            scannerControls.stop();
            const inviteCode = extractInviteCode(result.getText());
            setLinking(true);
            fetch('/api/parent/accept-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inviteCode }),
            })
              .then(async (response) => ({ response, json: await response.json() }))
              .then(({ response, json }) => {
                if (!response.ok || json.status === 'error') throw new Error(json.error || 'Parent link nahi ho saka.');
                toast.success(json.message || 'Parent account se link ho gaya.');
                setOpen(false);
                onLinkedRef.current?.(json.data?.linkId);
              })
              .catch((scanError) => {
                setError(scanError instanceof Error ? scanError.message : 'QR link nahi ho saka.');
                handledRef.current = false;
              })
              .finally(() => setLinking(false));
          }
        );
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      })
      .catch((cameraError) => {
        setStarting(false);
        setError(
          cameraError instanceof Error && cameraError.name === 'NotAllowedError'
            ? 'Camera permission allow karo.'
            : 'Camera start nahi ho saka. HTTPS aur camera permission check karo.'
        );
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4" />
        Scan parent QR
      </Button>
      {open && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="border-border bg-background w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl">
            <div className="border-border flex items-center justify-between border-b p-4">
              <div>
                <p className="font-semibold">Scan parent QR</p>
                <p className="text-muted-foreground text-xs">QR camera ke centre mein rakho</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close QR scanner">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative aspect-square overflow-hidden bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
              <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.36)]" />
              {(starting || linking) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">
                    {linking ? 'Parent se live connect ho raha hai...' : 'Camera start ho raha hai...'}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4">
              {error ? (
                <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl p-3 text-sm">
                  <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : (
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  QR se sirf invite code read hota hai; camera recording save nahi hoti.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ParentQrLinkCard({ onLinked }: { onLinked?: () => void }) {
  return (
    <Card className="border-cyan-500/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),rgba(6,182,212,0.08))]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Parent dashboard connect karo</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Parent ke dashboard par jo QR hai usay camera se scan karo; link foran live ho jayega.
            </p>
          </div>
        </div>
        <ParentQrScanner onLinked={() => onLinked?.()} />
      </CardContent>
    </Card>
  );
}
