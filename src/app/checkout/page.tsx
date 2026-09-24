import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PaddleCheckoutClient } from './PaddleCheckoutClient';
import { isPlayConsumptionOnlyRequest } from '@/lib/payments';
import { OnlineOnlyGate } from '@/components/features/offline/OnlineOnlyGate';

export default async function CheckoutPage() {
  const requestHeaders = await headers();
  if (isPlayConsumptionOnlyRequest(requestHeaders)) {
    redirect('/subscription');
  }

  return (
    <OnlineOnlyGate feature="Checkout" description="Secure payment needs a live connection.">
      <Suspense
        fallback={<div className="flex min-h-[70vh] items-center justify-center">Loading secure checkout...</div>}
      >
        <PaddleCheckoutClient />
      </Suspense>
    </OnlineOnlyGate>
  );
}
