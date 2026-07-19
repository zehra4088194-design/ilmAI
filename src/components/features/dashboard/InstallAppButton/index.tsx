'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setShowButton(!isStandaloneMode());

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setShowButton(true);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowButton(false);
      toast.success('ilm AI home screen par install ho gaya.');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') setShowButton(false);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast.info(
      isIos
        ? 'Tap the Share button in Safari, then select “Add to Home Screen”.'
        : 'Open the browser menu and select “Install app” or “Add to Home screen”.',
      { duration: 6500 }
    );
  };

  if (!showButton) return null;

  return (
    <div className="flex justify-end">
      <motion.button
        type="button"
        onClick={installApp}
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={reduceMotion ? undefined : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        whileHover={reduceMotion ? undefined : { scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group border-primary/30 bg-card/90 text-foreground focus-visible:ring-ring relative isolate inline-flex items-center gap-2 overflow-hidden rounded-2xl border px-2.5 py-2 text-left shadow-lg shadow-violet-500/10 backdrop-blur transition-colors hover:border-violet-400/60 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Install ilm AI on your home screen"
      >
        <span className="bg-primary/20 absolute -inset-3 -z-10 scale-0 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-100" />
        <span className="border-primary/25 relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm">
          <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="h-full w-full object-cover" />
        </span>
        <span className="pr-0.5">
          <span className="block text-xs leading-tight font-bold">Install ilm AI</span>
          <span className="text-muted-foreground block text-[10px] leading-tight">Home screen par app</span>
        </span>
        <Download className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
      </motion.button>
    </div>
  );
}
