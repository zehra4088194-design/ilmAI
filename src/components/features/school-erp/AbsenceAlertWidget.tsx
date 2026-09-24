'use client';

import { useState } from 'react';
import { AlertTriangle, MessageCircle, Phone, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { AbsenceAlertRow } from '@/lib/school-erp/queries';

/** Strips everything but digits, then normalizes a local Pakistani number (0XXXXXXXXXX) to the
 * E.164 digit string wa.me expects (92XXXXXXXXXX, no leading +). Numbers that already look
 * international (start with a country code, 11+ digits, no leading 0) pass through unchanged. */
function toWhatsAppDigits(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
}

export function AbsenceAlertWidget({ absences }: { absences: AbsenceAlertRow[] }) {
  const [target, setTarget] = useState<AbsenceAlertRow | null>(null);

  if (!absences.length) {
    return <p className="text-muted-foreground text-sm">No absences or late arrivals recorded today.</p>;
  }

  return (
    <div className="space-y-2">
      {absences.map((row) => (
        <div
          key={row.id}
          className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{row.studentName}</span>
              <Badge variant={row.status === 'absent' ? 'destructive' : 'outline'} className="shrink-0 capitalize">
                {row.status}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs">{row.className || 'Unassigned section'}</p>
          </div>
          {row.guardianPhone ? (
            <button
              type="button"
              onClick={() => setTarget(row)}
              className="border-border hover:bg-muted flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              <Phone className="h-3.5 w-3.5" />
              Contact
            </button>
          ) : (
            <span className="text-muted-foreground shrink-0 text-xs">No guardian phone</span>
          )}
        </div>
      ))}

      {target && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border-border w-full max-w-sm rounded-xl border p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold">
                    {target.studentName} — {target.status}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {target.guardianName ? `Contact ${target.guardianName}` : 'Contact guardian'} at{' '}
                    {target.guardianPhone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTarget(null)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={`tel:${target.guardianPhone}`}
                onClick={() => setTarget(null)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium',
                  'hover:bg-muted'
                )}
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <a
                href={`https://wa.me/${toWhatsAppDigits(target.guardianPhone || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTarget(null)}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
