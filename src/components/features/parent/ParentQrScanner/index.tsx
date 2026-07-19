'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, ImageUp, Link2, Loader2, QrCode, ShieldCheck, X } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildParentConnectPath, normalizeParentInvitePayload } from '@/lib/parent/invite-code';

type ScannerMode = 'camera' | 'upload';
type ResolvedInvite = { inviteCode: string; connectUrl: string };

async function parseScanResponse(response: Response): Promise<ResolvedInvite> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.status === 'error') {
    throw new Error(json.error || 'The parent QR code could not be validated.');
  }

  const inviteCode = normalizeParentInvitePayload(json.data?.inviteCode);
  if (!inviteCode) throw new Error('The server returned an invalid parent code.');
  const connectUrl = buildParentConnectPath(inviteCode);
  if (json.data?.connectUrl !== connectUrl) throw new Error('The parent link is invalid.');
  return { inviteCode, connectUrl };
}

async function resolveCameraPayload(payload: string) {
  return parseScanResponse(
    await fetch('/api/parent/scan-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    })
  );
}

async function resolveQrPicture(image: File) {
  const form = new FormData();
  form.append('image', image);
  return parseScanResponse(
    await fetch('/api/parent/scan-invite', {
      method: 'POST',
      body: form,
    })
  );
}

export function ParentQrScanner() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [starting, setStarting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedInvite, setResolvedInvite] = useState<ResolvedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open || mode !== 'camera' || resolvedInvite) return;

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
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current,
          (result, _scanError, scannerControls) => {
            controlsRef.current = scannerControls;
            if (!result || handledRef.current) return;

            handledRef.current = true;
            setResolving(true);
            setError(null);
            resolveCameraPayload(result.getText())
              .then((invite) => {
                if (!active) return;
                scannerControls.stop();
                setResolvedInvite(invite);
              })
              .catch((scanError) => {
                if (!active) return;
                setError(scanError instanceof Error ? scanError.message : 'The QR link could not be found.');
                handledRef.current = false;
              })
              .finally(() => {
                if (active) setResolving(false);
              });
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
        if (!active) return;
        setStarting(false);
        setError(
          cameraError instanceof Error && cameraError.name === 'NotAllowedError'
            ? 'Allow camera access or upload a QR image.'
            : 'The camera could not start. Upload a QR image and try again.'
        );
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [mode, open, resolvedInvite]);

  const startCamera = () => {
    controlsRef.current?.stop();
    setMode('camera');
    setResolvedInvite(null);
    setError(null);
    setOpen(true);
  };

  const choosePicture = () => fileInputRef.current?.click();

  const handlePicture = async (image: File | undefined) => {
    if (!image) return;

    controlsRef.current?.stop();
    setMode('upload');
    setOpen(true);
    setResolvedInvite(null);
    setError(null);
    setResolving(true);
    try {
      setResolvedInvite(await resolveQrPicture(image));
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'The QR image could not be scanned.');
    } finally {
      setResolving(false);
    }
  };

  const closeScanner = () => {
    controlsRef.current?.stop();
    setOpen(false);
    setResolvedInvite(null);
    setError(null);
    setResolving(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={startCamera}>
          <Camera className="h-4 w-4" />
          Scan parent QR
        </Button>
        <Button type="button" variant="outline" onClick={choosePicture}>
          <ImageUp className="h-4 w-4" />
          Choose QR picture
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          const image = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          void handlePicture(image);
        }}
      />

      {open && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="border-border bg-background w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl">
            <div className="border-border flex items-center justify-between border-b p-4">
              <div>
                <p className="font-semibold">{resolvedInvite ? 'Parent link ready' : 'Read parent QR'}</p>
                <p className="text-muted-foreground text-xs">
                  {resolvedInvite
                    ? 'Connection starts after you press the button'
                    : 'Use the camera or upload a QR image'}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={closeScanner} aria-label="Close QR scanner">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {resolvedInvite ? (
              <div className="space-y-5 p-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <div>
                  <p className="text-lg font-bold">Valid parent invite mil gaya</p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    The account is not connected yet. Press the button below to open the confirmation page.
                  </p>
                </div>
                <p className="bg-muted rounded-xl px-4 py-3 font-mono text-sm font-semibold tracking-widest">
                  {resolvedInvite.inviteCode}
                </p>
                <Button asChild variant="gradient" className="w-full">
                  <a href={resolvedInvite.connectUrl}>
                    <Link2 className="h-4 w-4" />
                    Press to connect
                  </a>
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={choosePicture}>
                  Choose another picture
                </Button>
              </div>
            ) : mode === 'camera' ? (
              <div className="relative aspect-square overflow-hidden bg-black">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.36)]" />
                {(starting || resolving) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">
                      {resolving ? 'Verifying the QR code on the server...' : 'Starting camera...'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_58%)] p-8 text-center">
                {resolving ? (
                  <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                ) : (
                  <ImageUp className="h-10 w-10 text-violet-500" />
                )}
                <div>
                  <p className="font-semibold">{resolving ? 'Scanning image...' : 'QR code not read'}</p>
                  <p className="text-muted-foreground mt-1 text-sm">Select a clear, straight, complete QR image.</p>
                </div>
                {!resolving && (
                  <Button type="button" variant="outline" onClick={choosePicture}>
                    Choose another picture
                  </Button>
                )}
              </div>
            )}

            {!resolvedInvite && (
              <div className="space-y-3 p-4">
                {error ? (
                  <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl p-3 text-sm">
                    <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : (
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Camera recordings and uploaded images are not saved; the server only reads the QR code.
                  </p>
                )}
                {mode === 'camera' && (
                  <Button type="button" variant="outline" className="w-full" onClick={choosePicture}>
                    <ImageUp className="h-4 w-4" />
                    Camera not working? Choose a picture
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function ParentQrLinkCard() {
  return (
    <Card className="border-cyan-500/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),rgba(6,182,212,0.08))]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Connect the parent dashboard</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Scan with the camera or choose a QR image. When a valid link is found, press &ldquo;Press to connect&rdquo;
              button aayega.
            </p>
          </div>
        </div>
        <ParentQrScanner />
      </CardContent>
    </Card>
  );
}
