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
          ? 'Privacy notice: AI chats, scans, voice files, parent attachments aur in-app messages zyada se zyada 2 din rakhe jate hain, phir automatically delete ho jate hain. Library resources aur academic progress mutasir nahi honge.'
          : 'Privacy notice: AI chats, scans, voice files, parent attachments, and in-app messages are retained for up to 2 days and then automatically deleted. Library resources and academic progress are not affected.'}
      </p>
    </div>
  );
}
