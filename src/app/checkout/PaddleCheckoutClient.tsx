'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { initializePaddle, type Paddle, type PaddleEventData } from '@paddle/paddle-js';
import { AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaddleCheckoutClient() {
  const searchParams = useSearchParams();
  const openedTransaction = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transactionId = searchParams.get('transaction_id') || searchParams.get('_ptxn');

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!transactionId) {
      setError('Checkout transaction is missing. Start checkout again from the plan page.');
      return;
    }
    if (!token) {
      setError('The Paddle client token is not configured.');
      return;
    }
    if (openedTransaction.current === transactionId) return;

    let active = true;
    let paddle: Paddle | undefined;

    const openCheckout = async () => {
      try {
        paddle = await initializePaddle({
          token,
          ...(token.startsWith('test_') ? { environment: 'sandbox' as const } : {}),
          eventCallback: (event: PaddleEventData) => {
            if (event.name === 'checkout.completed') {
              window.location.assign('/subscription?success=true');
            }
          },
        });
        if (!active || !paddle) return;
        openedTransaction.current = transactionId;
        paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: 'inline',
            variant: 'one-page',
            frameTarget: 'paddle-checkout-frame',
            frameInitialHeight: 520,
            frameStyle: 'width:100%;min-width:312px;background:transparent;border:0;',
            theme: 'light',
            locale: 'en',
          },
        });
      } catch (checkoutError) {
        console.error('Paddle checkout failed:', checkoutError);
        if (active) setError('Secure checkout could not be loaded. Try again from the plan page.');
      }
    };

    void openCheckout();
    return () => {
      active = false;
      paddle?.Checkout.close();
    };
  }, [transactionId]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="border-border bg-card w-full overflow-hidden rounded-3xl border shadow-xl">
        <div className="border-border from-primary/15 border-b bg-gradient-to-r to-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Secure Paddle checkout</h1>
              <p className="text-muted-foreground mt-1 text-sm">Card details are not stored on ilm AI servers.</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-4 text-sm">{error}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/subscription">Back to plans</Link>
            </Button>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="paddle-checkout-frame min-h-[520px]" />
            <p className="text-muted-foreground mt-3 text-center text-xs">
              Your plan will activate after payment is verified by the webhook.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
