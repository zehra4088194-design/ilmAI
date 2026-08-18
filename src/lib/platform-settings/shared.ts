import type { SubscriptionTier } from '@/types';

export type BillingCurrency = 'USD' | 'PKR';
export type PdfThemeMode = 'follow-user' | 'dark' | 'light';
export type AdminAiProvider = 'local' | 'groq' | 'gemini' | 'deepseek' | 'advanced' | 'grok' | 'claude' | 'gpt';
export type AiRoutingKey =
  | 'sideChat'
  | 'aiTutor'
  | 'studyTools'
  | 'grading'
  | 'resourceTest'
  | 'resourceSummary'
  | 'presentation'
  | 'visionOcr'
  | 'studentChatModeration';
export type AiRoutingSettings = Record<AiRoutingKey, AdminAiProvider>;
export type ExchangeRateSettings = {
  usdToPkr: number;
  base: 'USD';
  target: 'PKR';
  lastUpdated: string | null;
  fetchedAt: string | null;
};

export type ProviderBudgetKey =
  'groqFast' | 'groqLarge' | 'gemini' | 'deepseek' | 'ocrSpace' | 'openRouter' | 'grok' | 'claude' | 'gpt';

export type ProviderDailyBudgets = Record<ProviderBudgetKey, number>;

export type PlanAudience = 'school' | 'college' | 'university';

export type AudienceFeatureLimits = {
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
  // When true, price.PKR is whatever the admin typed and is preserved as-is —
  // the USD*exchangeRate auto-conversion (normally re-applied on every read/
  // save, see normalizePlatformSettings) is skipped for this tier. Off by
  // default so PKR keeps tracking the live USD/PKR rate unless an admin
  // explicitly opts a plan out of that.
  pkrManual: boolean;
  limits: {
    aiLifetimeDemoCredits: number;
    aiCreditsWeekly: number;
    aiCreditsDaily: number;
    aiCreditsMonthly: number;
    premiumAiMonthly: number;
    quizDaily: number;
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

// Master prompt Part 6.1: a single global base monthly USD price per institution
// type, plus admin-set discount percentages — the annual/volume $ amounts are
// always computed from these (monthly * 12 * (1 - discount%)), never hand-entered,
// per the master prompt's explicit "never entered manually" instruction.
export type InstitutionPricingSettings = {
  school: { monthlyUsd: number };
  college: { monthlyUsd: number };
  annualDiscountPercent: number;
  volumeDiscountPercent: number;
  // An institution's plan-settings max_students at/above this qualifies for the
  // volume discount — a simple single-tier stand-in for "by student-count tier".
  volumeDiscountMinStudents: number;
};

export type PlatformSettings = {
  pdfThemeMode: PdfThemeMode;
  subscriptionPlans: Record<SubscriptionTier, PlatformSubscriptionPlan>;
  providerDailyBudgets: ProviderDailyBudgets;
  aiRouting: AiRoutingSettings;
  exchangeRate: ExchangeRateSettings;
  institutionPricing: InstitutionPricingSettings;
  // Gates the daily-morning study email cron (api/cron/daily-study-emails) — off by
  // default so it only starts sending once an admin explicitly flips it on here. Does
  // NOT gate the accompanying in-app notification, which is a separate, always-on
  // delivery — see that route's own comment for why the two are decoupled.
  dailyStudyEmailsEnabled: boolean;
};

export const SUBSCRIPTION_SETTINGS_KEY = 'subscription_plans';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  pdfThemeMode: 'dark',
  dailyStudyEmailsEnabled: false,
  // Default routing runs through OpenRouter for every text-only feature — the gateway's
  // 'advanced' provider already tries OpenRouter's own best-available free auto-router first
  // and falls back to DeepSeek v4 Flash (still on OpenRouter) automatically on error, so this
  // one setting gets that whole free-tier chain without any per-route wiring. visionOcr stays
  // on Gemini since it needs real multimodal image input, which the free OpenRouter chain
  // doesn't reliably provide.
  aiRouting: {
    sideChat: 'advanced',
    aiTutor: 'advanced',
    studyTools: 'advanced',
    grading: 'advanced',
    resourceTest: 'advanced',
    resourceSummary: 'advanced',
    presentation: 'advanced',
    visionOcr: 'gemini',
    studentChatModeration: 'advanced',
  },
  exchangeRate: {
    usdToPkr: 280,
    base: 'USD',
    target: 'PKR',
    lastUpdated: null,
    fetchedAt: null,
  },
  institutionPricing: {
    school: { monthlyUsd: 10 },
    college: { monthlyUsd: 20 },
    annualDiscountPercent: 15,
    volumeDiscountPercent: 10,
    volumeDiscountMinStudents: 500,
  },
  providerDailyBudgets: {
    // Conservative platform-wide caps for a free-hosted beta. Admin can tune
    // these without a deploy as provider dashboards expose the real quotas.
    groqFast: 400,
    groqLarge: 40,
    gemini: 200,
    deepseek: 500,
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
      pkrManual: false,
      limits: {
        aiLifetimeDemoCredits: 3,
        aiCreditsWeekly: 20,
        aiCreditsDaily: 3,
        aiCreditsMonthly: 0,
        premiumAiMonthly: 0,
        quizDaily: 3,
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
          presentationsMonthly: 0,
          presentationSlidesMax: 0,
          fileSummariesMonthly: 0,
          fileTestsMonthly: 0,
        },
        college: {
          presentationsMonthly: 0,
          presentationSlidesMax: 0,
          fileSummariesMonthly: 0,
          fileTestsMonthly: 0,
        },
        university: {
          // University Hub is fully credit-gated, not plan-gated: FREE users can use every
          // University Hub tool (PDF Summarizer, PharmaPulse, Project Builder, etc.) as long as
          // they have shared AI credits — Presentation Builder was the one exception, hard-locked
          // to Pro/Elite via a 0 monthly allowance here regardless of credit balance. A modest
          // non-zero allowance below Pro's (4/8) lets FREE's weekly credit pool (20 credits,
          // 8 credits/presentation ≈ 2-3/week) be the real limiter instead.
          presentationsMonthly: 3,
          presentationSlidesMax: 6,
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
        'Printed scan: 1 shared AI credit',
        'Handwritten scan: 3 shared AI credits',
        '3 University Hub uses/week',
        'Online notes/books reading with ads',
        'Parent Link connect-code setup only',
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
      pkrManual: false,
      limits: {
        aiLifetimeDemoCredits: 0,
        aiCreditsWeekly: 0,
        aiCreditsDaily: 15,
        aiCreditsMonthly: 300,
        premiumAiMonthly: 0,
        quizDaily: 10,
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
          presentationsMonthly: 1,
          presentationSlidesMax: 8,
          fileSummariesMonthly: 8,
          fileTestsMonthly: 8,
        },
        college: {
          presentationsMonthly: 2,
          presentationSlidesMax: 8,
          fileSummariesMonthly: 10,
          fileTestsMonthly: 6,
        },
        university: {
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
        '300 shared AI credits/month in one common pool',
        'Groq/DeepSeek budget AI routing',
        'Printed scan: 1 shared AI credit',
        'Handwritten scan: 3 shared AI credits',
        'School: 8 file tests/month',
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
      pkrManual: false,
      limits: {
        aiLifetimeDemoCredits: 0,
        aiCreditsWeekly: 0,
        aiCreditsDaily: 30,
        aiCreditsMonthly: 600,
        premiumAiMonthly: 10,
        quizDaily: 25,
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
          presentationsMonthly: 2,
          presentationSlidesMax: 12,
          fileSummariesMonthly: 20,
          fileTestsMonthly: 16,
        },
        college: {
          presentationsMonthly: 4,
          presentationSlidesMax: 12,
          fileSummariesMonthly: 25,
          fileTestsMonthly: 12,
        },
        university: {
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
        '600 shared AI credits/month in one common pool',
        '10 premium AI calls/month, budget model by default',
        'Printed scan: 1 shared AI credit',
        'Handwritten scan: 3 shared AI credits',
        'School: 16 file tests/month',
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

const AI_ROUTING_KEYS: AiRoutingKey[] = [
  'sideChat',
  'aiTutor',
  'studyTools',
  'grading',
  'resourceTest',
  'resourceSummary',
  'presentation',
  'visionOcr',
  'studentChatModeration',
];

function aiProviderOrFallback(value: unknown, fallback: AdminAiProvider): AdminAiProvider {
  return value === 'local' ||
    value === 'groq' ||
    value === 'gemini' ||
    value === 'deepseek' ||
    value === 'advanced' ||
    value === 'grok' ||
    value === 'claude' ||
    value === 'gpt'
    ? value
    : fallback;
}

function normalizeAiRouting(value: unknown): AiRoutingSettings {
  const source = value && typeof value === 'object' ? (value as Partial<AiRoutingSettings>) : {};
  return AI_ROUTING_KEYS.reduce((result, key) => {
    result[key] = aiProviderOrFallback(source[key], DEFAULT_PLATFORM_SETTINGS.aiRouting[key]);
    return result;
  }, {} as AiRoutingSettings);
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

function normalizeInstitutionPricing(value: unknown): InstitutionPricingSettings {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<InstitutionPricingSettings>;
  const fallback = DEFAULT_PLATFORM_SETTINGS.institutionPricing;
  return {
    school: { monthlyUsd: Math.max(0, numberOrFallback(source.school?.monthlyUsd, fallback.school.monthlyUsd)) },
    college: { monthlyUsd: Math.max(0, numberOrFallback(source.college?.monthlyUsd, fallback.college.monthlyUsd)) },
    annualDiscountPercent: Math.min(
      100,
      Math.max(0, numberOrFallback(source.annualDiscountPercent, fallback.annualDiscountPercent))
    ),
    volumeDiscountPercent: Math.min(
      100,
      Math.max(0, numberOrFallback(source.volumeDiscountPercent, fallback.volumeDiscountPercent))
    ),
    volumeDiscountMinStudents: Math.max(
      0,
      numberOrFallback(source.volumeDiscountMinStudents, fallback.volumeDiscountMinStudents)
    ),
  };
}

export function normalizePlatformSettings(input: unknown): PlatformSettings {
  const source = (input && typeof input === 'object' ? input : {}) as Partial<PlatformSettings>;
  const sourceProviderBudgets: Partial<ProviderDailyBudgets> =
    source.providerDailyBudgets && typeof source.providerDailyBudgets === 'object' ? source.providerDailyBudgets : {};
  const sourcePlans = (
    source.subscriptionPlans && typeof source.subscriptionPlans === 'object' ? source.subscriptionPlans : {}
  ) as Partial<Record<SubscriptionTier, Partial<PlatformSubscriptionPlan>>>;
  const sourceExchangeRate =
    source.exchangeRate && typeof source.exchangeRate === 'object'
      ? (source.exchangeRate as Partial<ExchangeRateSettings>)
      : {};
  const usdToPkr = Math.max(1, numberOrFallback(sourceExchangeRate.usdToPkr, DEFAULT_PLATFORM_SETTINGS.exchangeRate.usdToPkr));

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
      const usdMonthly = numberOrFallback(incomingPrice.USD?.monthly, fallback.price.USD.monthly);
      const usdAnnual = numberOrFallback(incomingPrice.USD?.annual, fallback.price.USD.annual);
      // pkrManual opts a plan out of the usual "PKR always = USD * live rate"
      // recompute below — an admin who hardcodes a PKR price wants exactly what
      // they typed to survive every settings read/save, not get silently
      // overwritten the next time the exchange-rate cron runs.
      const pkrManual = booleanOrFallback(incoming.pkrManual, fallback.pkrManual);
      const pkrMonthly = pkrManual
        ? Math.max(0, Math.round(numberOrFallback(incomingPrice.PKR?.monthly, fallback.price.PKR.monthly)))
        : Math.round(usdMonthly * usdToPkr);
      const pkrAnnual = pkrManual
        ? Math.max(0, Math.round(numberOrFallback(incomingPrice.PKR?.annual, fallback.price.PKR.annual)))
        : Math.round(usdAnnual * usdToPkr);

      acc[tier] = {
        tier,
        name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim() : fallback.name,
        enabled: booleanOrFallback(incoming.enabled, fallback.enabled),
        price: {
          USD: {
            monthly: usdMonthly,
            annual: usdAnnual,
          },
          PKR: {
            monthly: pkrMonthly,
            annual: pkrAnnual,
          },
        },
        pkrManual,
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
          universityHubWeekly: numberOrFallback(
            incomingLimits.universityHubWeekly,
            fallback.limits.universityHubWeekly
          ),
          liveVoiceDaily: numberOrFallback(incomingLimits.liveVoiceDaily, fallback.limits.liveVoiceDaily),
          flashcardsTotal: numberOrFallback(incomingLimits.flashcardsTotal, fallback.limits.flashcardsTotal),
          gameMinutesDaily: numberOrFallback(incomingLimits.gameMinutesDaily, fallback.limits.gameMinutesDaily),
          parentGuardiansMax: numberOrFallback(incomingLimits.parentGuardiansMax, fallback.limits.parentGuardiansMax),
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
    pdfThemeMode:
      source.pdfThemeMode === 'follow-user' || source.pdfThemeMode === 'light' || source.pdfThemeMode === 'dark'
        ? source.pdfThemeMode
        : DEFAULT_PLATFORM_SETTINGS.pdfThemeMode,
    subscriptionPlans,
    dailyStudyEmailsEnabled: booleanOrFallback(
      source.dailyStudyEmailsEnabled,
      DEFAULT_PLATFORM_SETTINGS.dailyStudyEmailsEnabled
    ),
    institutionPricing: normalizeInstitutionPricing(source.institutionPricing),
    aiRouting: normalizeAiRouting(source.aiRouting),
    exchangeRate: {
      usdToPkr,
      base: 'USD',
      target: 'PKR',
      lastUpdated:
        typeof sourceExchangeRate.lastUpdated === 'string' && sourceExchangeRate.lastUpdated
          ? sourceExchangeRate.lastUpdated
          : null,
      fetchedAt:
        typeof sourceExchangeRate.fetchedAt === 'string' && sourceExchangeRate.fetchedAt ? sourceExchangeRate.fetchedAt : null,
    },
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
      deepseek: Math.max(
        0,
        numberOrFallback(sourceProviderBudgets.deepseek, DEFAULT_PLATFORM_SETTINGS.providerDailyBudgets.deepseek)
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

export function getAdminAiProvider(settings: PlatformSettings, key: AiRoutingKey): AdminAiProvider {
  return settings.aiRouting[key] || DEFAULT_PLATFORM_SETTINGS.aiRouting[key];
}

export function convertUsdToPkr(usd: number, settings: PlatformSettings) {
  return Math.round(Number(usd || 0) * settings.exchangeRate.usdToPkr);
}

export function resolvePdfThemeMode(preference: PdfThemeMode, userUsesDarkTheme: boolean): 'light' | 'dark' {
  return preference === 'follow-user' ? (userUsesDarkTheme ? 'dark' : 'light') : preference;
}

export function getPlanFromSettings(settings: PlatformSettings, tier: SubscriptionTier) {
  return settings.subscriptionPlans[tier] || DEFAULT_PLATFORM_SETTINGS.subscriptionPlans[tier];
}

// Master prompt Part 6.1's "computed, never hand-entered" pricing: base monthly
// USD -> apply the volume discount (if the institution's student count qualifies)
// -> apply the annual discount (if billing annually) -> convert to PKR. This is
// the single source of truth the institution checkout reads from.
export function resolveInstitutionPricing(
  settings: PlatformSettings,
  institutionType: 'school' | 'college',
  billingCycle: 'monthly' | 'annual',
  studentCount = 0
) {
  const pricing = settings.institutionPricing;
  const baseMonthly = pricing[institutionType].monthlyUsd;
  const volumeEligible = studentCount >= pricing.volumeDiscountMinStudents && pricing.volumeDiscountMinStudents > 0;
  const afterVolume = volumeEligible ? baseMonthly * (1 - pricing.volumeDiscountPercent / 100) : baseMonthly;
  const usd =
    billingCycle === 'annual' ? afterVolume * 12 * (1 - pricing.annualDiscountPercent / 100) : afterVolume;
  return {
    usd: Math.round(usd * 100) / 100,
    pkr: convertUsdToPkr(usd, settings),
    volumeDiscountApplied: volumeEligible,
  };
}
