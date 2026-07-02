import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-24.acacia' as any });

export const PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  ELITE: process.env.STRIPE_PRICE_ID_PRO_ANNUAL, // placeholder mapping; configure separate Elite price in Stripe dashboard
};
