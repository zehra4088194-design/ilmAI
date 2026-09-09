/**
 * JazzCash SMS auto-verification — shared helpers used by both the SMS webhook receiver
 * (src/app/api/sms-receiver/route.ts) and the cross-match endpoint the WhatsApp worker calls
 * (src/app/api/payments/jazzcash/verify/route.ts).
 *
 * PLAN CODES: the JazzCash SMS only ever tells us an amount, and several plan/billing-cycle
 * combos can legitimately cost the same PKR figure (e.g. two different plan families priced the
 * same this month), so amount alone can't safely identify which plan a payment is for. Each
 * individual-plan checkout screen shows a short code (STU-PRO-M, PAR-ELITE-Y, ...) the payer
 * includes in their WhatsApp message alongside the transaction ID — see jazzcashPlanCode() /
 * parseJazzcashPlanCode() below. Institution plans use a different, per-claim code instead (see
 * institution_payment_verifications.claim_code) since each institution payment is already tied to
 * a specific pending DB row.
 */

import { convertUsdToPkr, resolvePlanAmountUsd, type PlatformSettings } from '@/lib/platform-settings/shared';
import { TRANSACTION_FEE_USD } from '@/lib/constants';

export type PlanFamily = 'student' | 'parent' | 'teacher' | 'university';
export type PlanTier = 'PRO' | 'ELITE';
export type BillingCycle = 'monthly' | 'annual';

export type ParsedIndividualPlanCode = {
  planFamily: PlanFamily;
  tier: PlanTier;
  billingCycle: BillingCycle;
};

const FAMILY_ABBREVIATION: Record<PlanFamily, string> = {
  student: 'STU',
  parent: 'PAR',
  teacher: 'TCH',
  university: 'UNI',
};
const ABBREVIATION_TO_FAMILY: Record<string, PlanFamily> = {
  STU: 'student',
  PAR: 'parent',
  TCH: 'teacher',
  UNI: 'university',
};

/** { planFamily: 'student', tier: 'PRO', billingCycle: 'monthly' } -> 'STU-PRO-M' */
export function jazzcashPlanCode(params: { planFamily?: PlanFamily; tier: PlanTier; billingCycle: BillingCycle }): string {
  const family = params.planFamily || 'student';
  const cycle = params.billingCycle === 'annual' ? 'Y' : 'M';
  return `${FAMILY_ABBREVIATION[family]}-${params.tier}-${cycle}`;
}

const PLAN_CODE_PATTERN = /^(STU|PAR|TCH|UNI)-(PRO|ELITE)-([MY])$/i;

/** 'stu-pro-m' -> { planFamily: 'student', tier: 'PRO', billingCycle: 'monthly' }, or null. */
export function parseJazzcashPlanCode(raw: string): ParsedIndividualPlanCode | null {
  const match = PLAN_CODE_PATTERN.exec(raw.trim());
  if (!match) return null;
  const family = ABBREVIATION_TO_FAMILY[match[1]!.toUpperCase()];
  if (!family) return null;
  return {
    planFamily: family,
    tier: match[2]!.toUpperCase() as PlanTier,
    billingCycle: match[3]!.toUpperCase() === 'Y' ? 'annual' : 'monthly',
  };
}

/**
 * The exact PKR total a payer was told to send for this plan code — recomputed live from
 * whatever the admin panel currently has saved (resolvePlanAmountUsd is already the single
 * source of truth every checkout screen reads from), plus the same flat transaction fee every
 * manual-wallet screen adds on top. Never cached/hardcoded, so a same-day price change in the
 * admin panel is reflected immediately, exactly like the checkout page itself.
 */
export function expectedIndividualPlanPkr(settings: PlatformSettings, parsed: ParsedIndividualPlanCode): number {
  const planUsd = resolvePlanAmountUsd(settings, parsed);
  const planPkr = convertUsdToPkr(planUsd, settings);
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);
  return planPkr + feePkr;
}

/** Institution claim codes are 8 uppercase hex chars — shape-distinct from STU-PRO-M etc. */
const INSTITUTION_CLAIM_CODE_PATTERN = /^[0-9A-F]{8}$/i;
export function looksLikeInstitutionClaimCode(raw: string): boolean {
  return INSTITUTION_CLAIM_CODE_PATTERN.test(raw.trim());
}

/** Digits-only TID, stripped of any stray whitespace/punctuation a payer might have typed. */
export function normalizeTid(raw: string): string {
  return raw.trim().replace(/[^A-Za-z0-9]/g, '');
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** now -> the ISO end-of-period timestamp for a fresh monthly/annual grant starting now. */
export function billingPeriodEnd(startAt: Date, billingCycle: BillingCycle): string {
  return new Date(startAt.getTime() + (billingCycle === 'annual' ? YEAR_MS : MONTH_MS)).toISOString();
}
