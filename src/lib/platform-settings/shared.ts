import type { SubscriptionTier } from '@/types';

export type BillingCurrency = 'PKR' | 'INR';

export type PlatformSubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  enabled: boolean;
  price: Record<BillingCurrency, { monthly: number; annual: number }>;
  limits: {
    aiSideChatDaily: number;
    aiToolDaily: number;
    quizDaily: number;
    ocrDaily: number;
    liveVoiceDaily: number;
    flashcardsTotal: number;
  };
  access: {
    pastPapers: boolean;
    downloadPDF: boolean;
    studentChat: boolean;
    liveVoice: boolean;
    prioritySupport: boolean;
    adsFree: boolean;
  };
  features: string[];
};

export type PlatformSettings = {
  subscriptionPlans: Record<SubscriptionTier, PlatformSubscriptionPlan>;
};

export const SUBSCRIPTION_SETTINGS_KEY = 'subscription_plans';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  subscriptionPlans: {
    FREE: {
      tier: 'FREE',
      name: 'Free',
      enabled: true,
      price: {
        PKR: { monthly: 0, annual: 0 },
        INR: { monthly: 0, annual: 0 },
      },
      limits: {
        aiSideChatDaily: 5,
        aiToolDaily: 3,
        quizDaily: 3,
        ocrDaily: 3,
        liveVoiceDaily: 0,
        flashcardsTotal: 50,
      },
      access: {
        pastPapers: true,
        downloadPDF: false,
        studentChat: false,
        liveVoice: false,
        prioritySupport: false,
        adsFree: false,
      },
      features: [
        '5 side-chat messages/day',
        '3/day preview for AI tools and testing',
        'Read notes/books in-app',
        'No PDF downloads',
        'Student chat requests only',
      ],
    },
    PRO: {
      tier: 'PRO',
      name: 'Pro',
      enabled: true,
      price: {
        PKR: { monthly: 500, annual: 4800 },
        INR: { monthly: 149, annual: 1499 },
      },
      limits: {
        aiSideChatDaily: 20,
        aiToolDaily: 20,
        quizDaily: 20,
        ocrDaily: 20,
        liveVoiceDaily: 0,
        flashcardsTotal: 1000,
      },
      access: {
        pastPapers: true,
        downloadPDF: true,
        studentChat: true,
        liveVoice: false,
        prioritySupport: true,
        adsFree: true,
      },
      features: [
        '20/day for every AI tool',
        '20/day AI testing, essays, OCR and tutor',
        '1000 flashcards',
        'All past papers',
        'PDF downloads unlocked',
        'Student chat unlocked',
        'Parent weekly reports and chat',
        'Priority support',
      ],
    },
    ELITE: {
      tier: 'ELITE',
      name: 'Elite',
      enabled: true,
      price: {
        PKR: { monthly: 800, annual: 7680 },
        INR: { monthly: 299, annual: 2999 },
      },
      limits: {
        aiSideChatDaily: 50,
        aiToolDaily: 50,
        quizDaily: 50,
        ocrDaily: 50,
        liveVoiceDaily: 50,
        flashcardsTotal: -1,
      },
      access: {
        pastPapers: true,
        downloadPDF: true,
        studentChat: true,
        liveVoice: true,
        prioritySupport: true,
        adsFree: true,
      },
      features: [
        '50/day for every AI tool',
        '50/day AI testing, essays, OCR and tutor',
        'Offline mode',
        'Elite-only Live Voice Call',
        'Pro AI model tier',
        '50 scans/day',
        'Elite parent insights',
        'Exam simulations',
        'Parent dashboard',
      ],
    },
  },
};

const TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ELITE'];

function numberOrFallback(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanOrFallback(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArrayOrFallback(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function normalizePlatformSettings(input: unknown): PlatformSettings {
  const source = (input && typeof input === 'object' ? input : {}) as Partial<PlatformSettings>;
  const sourcePlans = (source.subscriptionPlans && typeof source.subscriptionPlans === 'object' ? source.subscriptionPlans : {}) as Partial<
    Record<SubscriptionTier, Partial<PlatformSubscriptionPlan>>
  >;

  const subscriptionPlans = TIERS.reduce((acc, tier) => {
    const fallback = DEFAULT_PLATFORM_SETTINGS.subscriptionPlans[tier];
    const incoming = sourcePlans[tier] || {};
    const incomingPrice = (incoming.price || {}) as Partial<PlatformSubscriptionPlan['price']>;
    const incomingLimits = (incoming.limits || {}) as Partial<PlatformSubscriptionPlan['limits']>;
    const incomingAccess = (incoming.access || {}) as Partial<PlatformSubscriptionPlan['access']>;

    acc[tier] = {
      tier,
      name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim() : fallback.name,
      enabled: booleanOrFallback(incoming.enabled, fallback.enabled),
      price: {
        PKR: {
          monthly: numberOrFallback(incomingPrice.PKR?.monthly, fallback.price.PKR.monthly),
          annual: numberOrFallback(incomingPrice.PKR?.annual, fallback.price.PKR.annual),
        },
        INR: {
          monthly: numberOrFallback(incomingPrice.INR?.monthly, fallback.price.INR.monthly),
          annual: numberOrFallback(incomingPrice.INR?.annual, fallback.price.INR.annual),
        },
      },
      limits: {
        aiSideChatDaily: numberOrFallback(incomingLimits.aiSideChatDaily, fallback.limits.aiSideChatDaily),
        aiToolDaily: numberOrFallback(incomingLimits.aiToolDaily, fallback.limits.aiToolDaily),
        quizDaily: numberOrFallback(incomingLimits.quizDaily, fallback.limits.quizDaily),
        ocrDaily: numberOrFallback(incomingLimits.ocrDaily, fallback.limits.ocrDaily),
        liveVoiceDaily: numberOrFallback(incomingLimits.liveVoiceDaily, fallback.limits.liveVoiceDaily),
        flashcardsTotal: numberOrFallback(incomingLimits.flashcardsTotal, fallback.limits.flashcardsTotal),
      },
      access: {
        pastPapers: booleanOrFallback(incomingAccess.pastPapers, fallback.access.pastPapers),
        downloadPDF: booleanOrFallback(incomingAccess.downloadPDF, fallback.access.downloadPDF),
        studentChat: booleanOrFallback(incomingAccess.studentChat, fallback.access.studentChat),
        liveVoice: booleanOrFallback(incomingAccess.liveVoice, fallback.access.liveVoice),
        prioritySupport: booleanOrFallback(incomingAccess.prioritySupport, fallback.access.prioritySupport),
        adsFree: booleanOrFallback(incomingAccess.adsFree, fallback.access.adsFree),
      },
      features: stringArrayOrFallback(incoming.features, fallback.features),
    };
    return acc;
  }, {} as Record<SubscriptionTier, PlatformSubscriptionPlan>);

  return { subscriptionPlans };
}

export function getPlanFromSettings(settings: PlatformSettings, tier: SubscriptionTier) {
  return settings.subscriptionPlans[tier] || DEFAULT_PLATFORM_SETTINGS.subscriptionPlans[tier];
}
