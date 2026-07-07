'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: 'sandbox') => void;
      };
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: {
          transactionId: string;
          settings?: {
            allowLogout?: boolean;
            displayMode?: 'overlay';
            locale?: string;
            successUrl?: string;
            theme?: 'light';
          };
        }) => void;
      };
    };
  }
}

const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

function loadPaddleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Paddle) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Paddle script load nahi hui')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Paddle script load nahi hui'));
    document.body.appendChild(script);
  });
}

export function PaddleCheckoutClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Secure checkout open ho raha hai...');

  const transactionId = searchParams.get('transaction_id');
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const successUrl = searchParams.get('success_url') || `${fallbackOrigin}/subscription?success=true`;
  const cancelUrl = searchParams.get('cancel_url') || `${fallbackOrigin}/subscription?canceled=true`;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!transactionId) {
      setMessage('Transaction id missing hai.');
      return;
    }

    if (!token) {
      setMessage('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN set nahi hai.');
      return;
    }

    let isMounted = true;

    loadPaddleScript()
      .then(() => {
        if (!isMounted || !window.Paddle) return;

        if (token.startsWith('test_')) {
          window.Paddle.Environment?.set('sandbox');
        }

        window.Paddle.Initialize({ token });
        window.Paddle.Checkout.open({
          transactionId,
          settings: {
            allowLogout: false,
            displayMode: 'overlay',
            locale: 'en',
            successUrl,
            theme: 'light',
          },
        });
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setMessage('Checkout open nahi ho saka. Neeche se wapas ja sakte hain.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [successUrl, transactionId]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Paddle Checkout</h1>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href={cancelUrl}>Back to Subscription</Link>
        </Button>
      </div>
    </div>
  );
}
