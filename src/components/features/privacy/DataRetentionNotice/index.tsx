'use client';

import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/providers/I18nProvider';

export function DataRetentionNotice() {
  const { locale } = useLocale();
  const isRomanUrdu = locale === 'roman-ur';

  return (
    <div className="mx-auto mb-4 flex max-w-7xl items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {isRomanUrdu
          ? 'Privacy: recent chats 2 din live rehti hain; purani chats aur shared files securely archive ho jati hain. Temporary scans 2 din baad delete hoti hain.'
          : 'Privacy: recent chats stay live for 2 days; older chats and shared files are securely archived. Temporary scans are deleted after 2 days.'}
      </p>
    </div>
  );
}
