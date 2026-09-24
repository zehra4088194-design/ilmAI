'use client';

import { useEffect, useState } from 'react';
import { Copy, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

/** Phase 7b — a user's own referral code, share link, and copy button. */
export function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/referral/code')
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'success') setCode(json.data.code);
      });
  }, []);

  if (!code) return null;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${code}` : '';

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Gift className="h-5 w-5 text-violet-500" />
          <div>
            <p className="text-sm font-semibold">Invite a friend</p>
            <p className="text-muted-foreground text-xs">You both get coins when they subscribe. Code: <code className="bg-muted rounded px-1.5 py-0.5 font-mono">{code}</code></p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast.success('Referral link copied!');
          }}
        >
          <Copy className="h-3.5 w-3.5" />Copy link
        </Button>
      </CardContent>
    </Card>
  );
}
