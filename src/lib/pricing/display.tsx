'use client';

import type { ReactNode } from 'react';

export function formatUsd(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPkr(value: number) {
  return Math.round(value).toLocaleString('en-PK');
}

export function PricePair({
  usd,
  usdSuffix = '',
  usdToPkr,
  className = '',
  secondaryClassName = '',
  children,
}: {
  usd: number;
  usdSuffix?: string;
  usdToPkr: number;
  className?: string;
  secondaryClassName?: string;
  children?: ReactNode;
}) {
  const pkr = usd * usdToPkr;
  return (
    <div className={className}>
      <p className="font-bold">
        ${formatUsd(usd)}
        {usdSuffix && <span className="text-muted-foreground ml-1 text-sm font-normal">{usdSuffix}</span>}
      </p>
      <p className={`text-muted-foreground mt-1 text-sm ${secondaryClassName}`}> = Rs {formatPkr(pkr)}</p>
      {children}
    </div>
  );
}
