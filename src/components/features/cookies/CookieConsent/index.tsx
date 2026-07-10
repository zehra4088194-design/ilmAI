'use client';

import { useEffect, useState } from 'react';
import { Cookie, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DEFAULT_COOKIE_CONSENT, readCookieConsent, saveCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [prefs, setPrefs] = useState<CookieConsentPreferences>(DEFAULT_COOKIE_CONSENT);

  useEffect(() => {
    const saved = readCookieConsent();
    if (saved) setPrefs(saved);
    setOpen(!saved);
    setMounted(true);

    const openSettings = () => {
      setPrefs(readCookieConsent() || DEFAULT_COOKIE_CONSENT);
      setCustomizing(true);
      setOpen(true);
    };

    window.addEventListener('ilm-ai-open-cookie-settings', openSettings);
    return () => window.removeEventListener('ilm-ai-open-cookie-settings', openSettings);
  }, []);

  if (!mounted || !open) return null;

  const persist = (next: CookieConsentPreferences) => {
    saveCookieConsent(next);
    setPrefs(next);
    setOpen(false);
    setCustomizing(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] sm:inset-x-auto sm:right-4 sm:max-w-md">
      <Card className="border-violet-500/30 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Cookie preferences</h2>
                {customizing && (
                  <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setCustomizing(false)} aria-label="Close cookie settings">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Necessary cookies login aur preferences ke liye required hain. Analytics/ads cookies sirf aapki permission se use honge.
              </p>

              {customizing && (
                <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <PreferenceRow label="Necessary" description="Login, security, language aur core app state." checked disabled />
                  <PreferenceRow
                    label="Analytics"
                    description="Product usage samajhne ke liye optional analytics."
                    checked={prefs.analytics}
                    onChange={(checked) => setPrefs((current) => ({ ...current, analytics: checked }))}
                  />
                  <PreferenceRow
                    label="Marketing ads"
                    description="Free plan par AdSense ads dikhane ke liye."
                    checked={prefs.marketing}
                    onChange={(checked) => setPrefs((current) => ({ ...current, marketing: checked }))}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {customizing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => persist(DEFAULT_COOKIE_CONSENT)}>Necessary only</Button>
                    <Button size="sm" variant="gradient" onClick={() => persist(prefs)}>Save choices</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)}>
                      <Settings2 className="h-4 w-4" /> Options
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => persist(DEFAULT_COOKIE_CONSENT)}>Reject optional</Button>
                    <Button size="sm" variant="gradient" onClick={() => persist({ necessary: true, analytics: true, marketing: true })}>Accept all</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(value) => onChange?.(value === true)} />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
