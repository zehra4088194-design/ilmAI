import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ParentConnectPrompt() {
  return (
    <Card className="border-cyan-500/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),rgba(6,182,212,0.08))]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Connect the parent dashboard</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Ask your parent for their connect code and enter it under Settings to link your accounts.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/settings?tab=parent-link">Enter connect code</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
