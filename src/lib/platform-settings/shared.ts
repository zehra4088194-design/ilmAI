import type { SubscriptionTier } from '@/types';

export type BillingCurrency = 'USD' | 'PKR';

export type ProviderBudgetKey =
  'groqFast' | 'groqLarge' | 'gemini' | 'ocrSpace' | 'openRouter' | 'grok' | 'claude' | 'gpt';

export type ProviderDailyBudgets = Record<ProviderBudgetKey, number>;

export type PlanAudience = 'school' | 'college' | 'university';

export type AudienceFeatureLimits = {
  ocrHandwrittenMonthly: number;
  presentationsMonthly: number;
  presentationSlidesMax: number;
  fileSummariesMonthly: number;
  fileTestsMonthly: number;
};

export type PlatformSubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  enabled: boolean;
  price: Record<BillingCurrency, { monthly: number; annual: number }>;
  limits: {
    aiLifetimeDemoCredits: number;
    aiCreditsWeekly: number;
    aiCreditsDaily: number;
    aiCreditsMonthly: number;
    premiumAiMonthly: number;
    quizDaily: number;
    ocrPrintedMonthly: number;
    universityHubWeekly: number;
    liveVoiceDaily: number;
    flashcardsTotal: number;
    gameMinutesDaily: number;
    parentGuardiansMax: number;
    parentAttachmentFilesMonthly: number;
    parentAttachmentMegabytesMonthly: number;
  };
  audienceLimits: Record<PlanAudience, AudienceFeatureLimits>;
  access: {
    pastPapers: boolean;
    downloadPDF: boolean;
    studentChat: boolean;
    liveVoice: boolean;
    prioritySupport: boolean;
    adsFree: boolean;
    games: boolean;
    restPlaylists: boolean;
    parentDashboard: boolean;
    advancedParentAnalytics: boolean;
    parentReports: boolean;
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
    ocrSpace: 500,
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
        USD: { monthly: 0, annual: 0 },
        PKR: { monthly: 0, annual: 0 },
      },
      limits: {
        aiLifetimeDemoCredits: 3,
        aiCreditsWeekly: 20,
        aiCreditsDaily: 3,
        aiCreditsMonthly: 0,
        premiumAiMonthly: 0,
        quizDaily: 3,
        ocrPrintedMonthly: 5,
        universityHubWeekly: 3,
        liveVoiceDaily: 0,
        flashcardsTotal: 50,
        gameMinutesDaily: 0,
        parentGuardiansMax: 1,
        parentAttachmentFilesMonthly: 0,
        parentAttachmentMegabytesMonthly: 0,
      },
      audienceLimits: {
        school: {
          ocrHandwrittenMonthly: 0,
          presentationsMonthly: 0,
          presentationSlidesMax: 0,
          fileSummariesMonthly: 0,
          fileTestsMonthly: 0,
        },
        college: {
          ocrHandwrittenMonthly: 0,
          presentationsMonthly: 0,
          presentationSlidesMax: 0,
          fileSummariesMonthly: 0,
          fileTestsMonthly: 0,
        },
        university: {
          ocrHandwrittenMonthly: 0,
          presentationsMonthly: 0,
          presentationSlidesMax: 0,
          fileSummariesMonthly: 0,
          fileTestsMonthly: 0,
        },
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
        parentDashboard: false,
        advancedParentAnalytics: false,
        parentReports: false,
      },
      features: [
        '20 shared AI credits every week',
        '5 printed OCR scans/month',
        '3 University Hub uses/week',
        'Online notes/books reading with ads',
        'Parent Link/QR setup only',
        'No downloads, summaries, or file tests',
      ],
    },
    PRO: {
      tier: 'PRO',
      name: 'Pro',
      enabled: true,
      price: {
        USD: { monthly: 2.99, annual: 28.7 },
        PKR: { monthly: 849, annual: 8150 },
      },
      limits: {
        aiLifetimeDemoCredits: 0,
        aiCreditsWeekly: 0,
        aiCreditsDaily: 15,
        aiCreditsMonthly: 300,
        premiumAiMonthly: 0,
        quizDaily: 10,
        ocrPrintedMonthly: 100,
        universityHubWeekly: 10,
        liveVoiceDaily: 0,
        flashcardsTotal: 1000,
        gameMinutesDaily: 45,
        parentGuardiansMax: 1,
        parentAttachmentFilesMonthly: 10,
        parentAttachmentMegabytesMonthly: 20,
      },
      audienceLimits: {
        school: {
          ocrHandwrittenMonthly: 20,
          presentationsMonthly: 1,
          presentationSlidesMax: 8,
          fileSummariesMonthly: 8,
          fileTestsMonthly: 8,
        },
        college: {
          ocrHandwrittenMonthly: 15,
          presentationsMonthly: 2,
          presentationSlidesMax: 8,
          fileSummariesMonthly: 10,
          fileTestsMonthly: 6,
        },
        university: {
          ocrHandwrittenMonthly: 10,
          presentationsMonthly: 4,
          presentationSlidesMax: 8,
          fileSummariesMonthly: 15,
          fileTestsMonthly: 4,
        },
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
        parentDashboard: true,
        advancedParentAnalytics: false,
        parentReports: true,
      },
      features: [
        '300 shared AI credits/month, max 15/day',
        'Groq/DeepSeek budget AI routing',
        '100 printed OCR scans/month',
        'School: 20 handwritten scans and 8 file tests/month',
        'University: 4 presentations and 15 file summaries/month',
        'Downloads, offline reading, and ad-free access',
        '1 guardian with cached weekly report',
        '10 attachments or 20 MB/month',
      ],
    },
    ELITE: {
      tier: 'ELITE',
      name: 'Elite',
      enabled: true,
      price: {
        USD: { monthly: 4.99, annual: 47.9 },
        PKR: { monthly: 1399, annual: 13430 },
      },
      limits: {
        aiLifetimeDemoCredits: 0,
        aiCreditsWeekly: 0,
        aiCreditsDaily: 30,
        aiCreditsMonthly: 600,
        premiumAiMonthly: 10,
        quizDaily: 25,
        ocrPrintedMonthly: 300,
        universityHubWeekly: 25,
        liveVoiceDaily: 0,
        flashcardsTotal: 5000,
        gameMinutesDaily: 45,
        parentGuardiansMax: 2,
        parentAttachmentFilesMonthly: 30,
        parentAttachmentMegabytesMonthly: 100,
      },
      audienceLimits: {
        school: {
          ocrHandwrittenMonthly: 50,
          presentationsMonthly: 2,
          presentationSlidesMax: 12,
          fileSummariesMonthly: 20,
          fileTestsMonthly: 16,
        },
        college: {
          ocrHandwrittenMonthly: 35,
          presentationsMonthly: 4,
          presentationSlidesMax: 12,
          fileSummariesMonthly: 25,
          fileTestsMonthly: 12,
        },
        university: {
          ocrHandwrittenMonthly: 25,
          presentationsMonthly: 8,
          presentationSlidesMax: 12,
          fileSummariesMonthly: 35,
          fileTestsMonthly: 10,
        },
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
        parentDashboard: true,
        advancedParentAnalytics: true,
        parentReports: true,
      },
      features: [
        '600 shared AI credits/month, max 30/day',
        '10 premium AI calls/month, budget model by default',
        '300 printed OCR scans/month',
        'School: 50 handwritten scans and 16 file tests/month',
        'University: 8 presentations and 35 file summaries/month',
        'Downloads, offline reading, and ad-free access',
        '2 guardians with detailed weekly insights',
        '30 attachments or 100 MB/month',
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

function normalizeAudienceLimits(
  value: Partial<Record<PlanAudience, Partial<AudienceFeatureLimits>>> | undefined,
  fallback: Record<PlanAudience, AudienceFeatureLimits>
): Record<PlanAudience, AudienceFeatureLimits> {
  return (['school', 'college', 'university'] as const).reduce(
    (result, audience) => {
      const incoming = value?.[audience] || {};
      const defaults = fallback[audience];
      result[audience] = {
        ocrHandwrittenMonthly: numberOrFallback(
          incoming.ocrHandwrittenMonthly,
          defaults.ocrHandwrittenMonthly
        ),
        presentationsMonthly: numberOrFallback(incoming.presentationsMonthly, defaults.presentationsMonthly),
        presentationSlidesMax: numberOrFallback(incoming.presentationSlidesMax, defaults.presentationSlidesMax),
        fileSummariesMonthly: numberOrFallback(incoming.fileSummariesMonthly, defaults.fileSummariesMonthly),
        fileTestsMonthly: numberOrFallback(incoming.fileTestsMonthly, defaults.fileTestsMonthly),
      };
      return result;
    },
    {} as Record<PlanAudience, AudienceFeatureLimits>
  );
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
      const incomingAudienceLimits = (incoming.audienceLimits || {}) as Partial<
        Record<PlanAudience, Partial<AudienceFeatureLimits>>
      >;

      acc[tier] = {
        tier,
        name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim() : fallback.name,
        enabled: booleanOrFallback(incoming.enabled, fallback.enabled),
        price: {
          USD: {
            monthly: numberOrFallback(incomingPrice.USD?.monthly, fallback.price.USD.monthly),
            annual: numberOrFallback(incomingPrice.USD?.annual, fallback.price.USD.annual),
          },
          PKR: {
            monthly: numberOrFallback(incomingPrice.PKR?.monthly, fallback.price.PKR.monthly),
            annual: numberOrFallback(incomingPrice.PKR?.annual, fallback.price.PKR.annual),
          },
        },
        limits: {
          aiLifetimeDemoCredits: numberOrFallback(
            incomingLimits.aiLifetimeDemoCredits,
            fallback.limits.aiLifetimeDemoCredits
          ),
          aiCreditsWeekly: numberOrFallback(incomingLimits.aiCreditsWeekly, fallback.limits.aiCreditsWeekly),
          aiCreditsDaily: numberOrFallback(incomingLimits.aiCreditsDaily, fallback.limits.aiCreditsDaily),
          aiCreditsMonthly: numberOrFallback(incomingLimits.aiCreditsMonthly, fallback.limits.aiCreditsMonthly),
          premiumAiMonthly: numberOrFallback(incomingLimits.premiumAiMonthly, fallback.limits.premiumAiMonthly),
          quizDaily: numberOrFallback(incomingLimits.quizDaily, fallback.limits.quizDaily),
          ocrPrintedMonthly: numberOrFallback(
            incomingLimits.ocrPrintedMonthly,
            fallback.limits.ocrPrintedMonthly
          ),
          universityHubWeekly: numberOrFallback(
            incomingLimits.universityHubWeekly,
            fallback.limits.universityHubWeekly
          ),
          liveVoiceDaily: numberOrFallback(incomingLimits.liveVoiceDaily, fallback.limits.liveVoiceDaily),
          flashcardsTotal: numberOrFallback(incomingLimits.flashcardsTotal, fallback.limits.flashcardsTotal),
          gameMinutesDaily: numberOrFallback(incomingLimits.gameMinutesDaily, fallback.limits.gameMinutesDaily),
          parentGuardiansMax: numberOrFallback(
            incomingLimits.parentGuardiansMax,
            fallback.limits.parentGuardiansMax
          ),
          parentAttachmentFilesMonthly: numberOrFallback(
            incomingLimits.parentAttachmentFilesMonthly,
            fallback.limits.parentAttachmentFilesMonthly
          ),
          parentAttachmentMegabytesMonthly: numberOrFallback(
            incomingLimits.parentAttachmentMegabytesMonthly,
            fallback.limits.parentAttachmentMegabytesMonthly
          ),
        },
        audienceLimits: normalizeAudienceLimits(incomingAudienceLimits, fallback.audienceLimits),
        access: {
          pastPapers: booleanOrFallback(incomingAccess.pastPapers, fallback.access.pastPapers),
          downloadPDF: booleanOrFallback(incomingAccess.downloadPDF, fallback.access.downloadPDF),
          studentChat: booleanOrFallback(incomingAccess.studentChat, fallback.access.studentChat),
          liveVoice: false,
          prioritySupport: booleanOrFallback(incomingAccess.prioritySupport, fallback.access.prioritySupport),
          adsFree: booleanOrFallback(incomingAccess.adsFree, fallback.access.adsFree),
          games: booleanOrFallback(incomingAccess.games, fallback.access.games),
          restPlaylists: booleanOrFallback(incomingAccess.restPlaylists, fallback.access.restPlaylists),
          parentDashboard: booleanOrFallback(incomingAccess.parentDashboard, fallback.access.parentDashboard),
          advancedParentAnalytics: booleanOrFallback(
            incomingAccess.advancedParentAnalytics,
            fallback.access.advancedParentAnalytics
          ),
          parentReports: booleanOrFallback(incomingAccess.parentReports, fallback.access.parentReports),
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
