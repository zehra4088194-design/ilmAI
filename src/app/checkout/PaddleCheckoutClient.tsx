'use client';

import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MANUAL_PAYMENT_OPTIONS } from '@/lib/constants';

export function PaddleCheckoutClient() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Landmark className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Manual Payment</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Filhaal online checkout disabled hai. In numbers par payment send karke screenshot zehra4088194@gmail.com
          par share karein. Within 1 hour your transaction will be verified.
        </p>
        <div className="mb-6 space-y-2 text-left">
          {MANUAL_PAYMENT_OPTIONS.map((option) => (
            <div key={option.label} className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="text-sm text-muted-foreground">{option.number}</p>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/subscription">Back to Subscription</Link>
        </Button>
      </div>
    </div>
  );
}
