import type { SubscriptionTier } from '@/types';

export type BillingCurrency = 'PKR' | 'INR';

export type ProviderBudgetKey =
  'groqFast' | 'groqLarge' | 'gemini' | 'ocrSpace' | 'openRouter' | 'grok' | 'claude' | 'gpt';

export type ProviderDailyBudgets = Record<ProviderBudgetKey, number>;

export type PlatformSubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  enabled: boolean;
  price: Record<BillingCurrency, { monthly: number; annual: number }>;
  limits: {
    aiSideChatDaily: number;
    aiToolDaily: number;
    quizDaily: number;
    ocrPrintedWeekly: number;
    ocrHandwrittenWeekly: number;
    universityHubWeekly: number;
    liveVoiceDaily: number;
    flashcardsTotal: number;
    gameMinutesDaily: number;
  };
  access: {
    pastPapers: boolean;
    downloadPDF: boolean;
    studentChat: boolean;
    liveVoice: boolean;
    prioritySupport: boolean;
    adsFree: boolean;
    games: boolean;
    restPlaylists: boolean;
  };
  features: string[];
};

export type PlatformSettings = {
  subscriptionPlans: Record<SubscriptionTier, PlatformSubscriptionPlan>;
  providerDailyBudgets: ProviderDailyBudgets;
};

export const SUBSCRIPTION_SETTINGS_KEY = 'subscription_plans';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  providerDailyBudgets: {
    // Conservative platform-wide caps for a free-hosted beta. Admin can tune
    // these without a deploy as provider dashboards expose the real quotas.
    groqFast: 400,
    groqLarge: 40,
    gemini: 200,
    ocrSpace: 450,
    openRouter: 45,
    grok: 100,
    claude: 0,
    gpt: 0,
  },
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
        aiSideChatDaily: 10,
        aiToolDaily: 3,
        quizDaily: 3,
        ocrPrintedWeekly: 10,
        ocrHandwrittenWeekly: 5,
        universityHubWeekly: 3,
        liveVoiceDaily: 0,
        flashcardsTotal: 50,
        gameMinutesDaily: 0,
      },
      access: {
        pastPapers: true,
        downloadPDF: false,
        studentChat: false,
        liveVoice: false,
        prioritySupport: false,
        adsFree: false,
        games: false,
        restPlaylists: false,
      },
      features: [
        '10 side-chat messages/day',
        '3 shared AI tool uses/day',
        '10 printed and 5 handwritten scans/week',
        '3 University Hub uses/week',
        'Read notes/books in-app',
        'No PDF downloads',
        'Student chat requests only',
        'Games and relaxing playlists are Pro features',
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
        ocrPrintedWeekly: -1,
        ocrHandwrittenWeekly: 50,
        universityHubWeekly: -1,
        liveVoiceDaily: 0,
        flashcardsTotal: 1000,
        gameMinutesDaily: 45,
      },
      access: {
        pastPapers: true,
        downloadPDF: true,
        studentChat: true,
        liveVoice: false,
        prioritySupport: true,
        adsFree: true,
        games: true,
        restPlaylists: true,
      },
      features: [
        '20 shared AI tool uses/day',
        'Unlimited OCR.space printed scans and 50 handwritten scans/week',
        '1000 flashcards',
        'All past papers',
        'PDF downloads unlocked',
        'Student chat unlocked',
        '45 minutes/day live games',
        'Relaxing sound playlists',
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
        ocrPrintedWeekly: 200,
        ocrHandwrittenWeekly: 100,
        universityHubWeekly: -1,
        liveVoiceDaily: 0,
        flashcardsTotal: -1,
        gameMinutesDaily: 45,
      },
      access: {
        pastPapers: true,
        downloadPDF: true,
        studentChat: true,
        liveVoice: false,
        prioritySupport: true,
        adsFree: true,
        games: true,
        restPlaylists: true,
      },
      features: [
        '50 shared AI tool uses/day',
        'Offline mode',
        'Live Voice Call coming soon',
        'Pro AI model tier',
        '200 printed and 100 handwritten scans/week',
        'Elite parent insights',
        'Exam simulations',
        'Parent dashboard',
        '45 minutes/day live games',
        'Relaxing sound playlists',
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
  const sourceProviderBudgets: Partial<ProviderDailyBudgets> =
    source.providerDailyBudgets && typeof source.providerDailyBudgets === 'object' ? source.providerDailyBudgets : {};
  const sourcePlans = (
    source.subscriptionPlans && typeof source.subscriptionPlans === 'object' ? source.subscriptionPlans : {}
  ) as Partial<Record<SubscriptionTier, Partial<PlatformSubscriptionPlan>>>;

  const subscriptionPlans = TIERS.reduce(
    (acc, tier) => {
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
          aiSideChatDaily:
            tier === 'FREE'
              ? Math.max(10, numberOrFallback(incomingLimits.aiSideChatDaily, fallback.limits.aiSideChatDaily))
              : numberOrFallback(incomingLimits.aiSideChatDaily, fallback.limits.aiSideChatDaily),
          aiToolDaily: numberOrFallback(incomingLimits.aiToolDaily, fallback.limits.aiToolDaily),
          quizDaily: numberOrFallback(incomingLimits.quizDaily, fallback.limits.quizDaily),
          ocrPrintedWeekly: numberOrFallback(incomingLimits.ocrPrintedWeekly, fallback.limits.ocrPrintedWeekly),
          ocrHandwrittenWeekly: numberOrFallback(
            incomingLimits.ocrHandwrittenWeekly,
            fallback.limits.ocrHandwrittenWeekly
          ),
          universityHubWeekly: numberOrFallback(
            incomingLimits.universityHubWeekly,
            fallback.limits.universityHubWeekly
          ),
          liveVoiceDaily: numberOrFallback(incomingLimits.liveVoiceDaily, fallback.limits.liveVoiceDaily),
          flashcardsTotal: numberOrFallback(incomingLimits.flashcardsTotal, fallback.limits.flashcardsTotal),
          gameMinutesDaily: numberOrFallback(incomingLimits.gameMinutesDaily, fallback.limits.gameMinutesDaily),
        },
        access: {
          pastPapers: booleanOrFallback(incomingAccess.pastPapers, fallback.access.pastPapers),
          downloadPDF: booleanOrFallback(incomingAccess.downloadPDF, fallback.access.downloadPDF),
          studentChat: booleanOrFallback(incomingAccess.studentChat, fallback.access.studentChat),
          liveVoice: false,
          prioritySupport: booleanOrFallback(incomingAccess.prioritySupport, fallback.access.prioritySupport),
          adsFree: booleanOrFallback(incomingAccess.adsFree, fallback.access.adsFree),
          games: booleanOrFallback(incomingAccess.games, fallback.access.games),
          restPlaylists: booleanOrFallback(incomingAccess.restPlaylists, fallback.access.restPlaylists),
        },
        features: stringArrayOrFallback(incoming.features, fallback.features),
      };
      return acc;
    },
    {} as Record<SubscriptionTier, PlatformSubscriptionPlan>
  );

  return {
    subscriptionPlans,
    providerDailyBudgets: {
      groqFast: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.groqFast, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.groqFast)
      ),
      groqLarge: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.groqLarge, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.groqLarge)
      ),
      gemini: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.gemini, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.gemini)
      ),
      ocrSpace: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.ocrSpace, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.ocrSpace)
      ),
      openRouter: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.openRouter, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.openRouter)
      ),
      grok: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.grok, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.grok)
      ),
      claude: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.claude, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.claude)
      ),
      gpt: Math.max(0, numberOrFallback(sourceProviderBudgets.gpt, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.gpt)),
    },
  };
}

export function getPlanFromSettings(settings: PlatformSettings, tier: SubscriptionTier) {
  return settings.subscriptionPlans[tier] || DEFAULT_PLATFORM_SETTINGS.subscriptionPlans[tier];
}
