'use client';

import { Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Compatibility shell for the former standalone PeerJS caller.
 *
 * Person-to-person browser calling is disabled project-wide. Directory contacts now use the
 * device's normal phone dialer instead, so this component no longer initializes PeerJS or asks
 * for microphone access.
 */
export function VoiceCallClient({
  callerName,
  callerPhone,
}: {
  supabase?: unknown;
  institutionType?: string;
  organizationId?: string;
  currentUserId?: string;
  callerName: string;
  callerAvatar?: string | null;
  callerPhone?: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Phone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{callerName || 'Contact'}</p>
          <p className="text-muted-foreground text-sm">
            In-app calling is disabled. Use the saved phone number to call this contact.
          </p>
          {callerPhone && <p className="mt-1 text-sm font-medium">{callerPhone}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
