-- Final launch entitlements. AI credits are shared across tools, Free demos are
-- lifetime-only, and expensive feature quotas are weighted by education level.

update public.platform_settings
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          value,
          '{subscriptionPlans,FREE,limits}',
          '{
            "aiLifetimeDemoCredits":3,
            "aiCreditsDaily":3,
            "aiCreditsMonthly":0,
            "premiumAiMonthly":0,
            "quizDaily":3,
            "ocrPrintedMonthly":5,
            "universityHubWeekly":3,
            "liveVoiceDaily":0,
            "flashcardsTotal":50,
            "gameMinutesDaily":0,
            "parentGuardiansMax":1,
            "parentAttachmentFilesMonthly":0,
            "parentAttachmentMegabytesMonthly":0
          }'::jsonb,
          true
        ),
        '{subscriptionPlans,FREE,audienceLimits}',
        '{
          "school":{"ocrHandwrittenMonthly":0,"presentationsMonthly":0,"presentationSlidesMax":0,"fileSummariesMonthly":0,"fileTestsMonthly":0},
          "college":{"ocrHandwrittenMonthly":0,"presentationsMonthly":0,"presentationSlidesMax":0,"fileSummariesMonthly":0,"fileTestsMonthly":0},
          "university":{"ocrHandwrittenMonthly":0,"presentationsMonthly":0,"presentationSlidesMax":0,"fileSummariesMonthly":0,"fileTestsMonthly":0}
        }'::jsonb,
        true
      ),
      '{subscriptionPlans,FREE,access}',
      '{
        "pastPapers":true,"downloadPDF":false,"studentChat":false,"liveVoice":false,
        "prioritySupport":false,"adsFree":false,"games":false,"restPlaylists":false,
        "parentDashboard":false,"advancedParentAnalytics":false,"parentReports":false
      }'::jsonb,
      true
    ),
    '{subscriptionPlans,FREE,features}',
    '[
      "3 shared AI demo credits, lifetime",
      "5 printed OCR scans/month",
      "3 University Hub uses/week",
      "Online notes/books reading with ads",
      "Parent Link/QR setup only",
      "No downloads, summaries, or file tests"
    ]'::jsonb,
    true
  ),
  updated_at = now()
where key = 'subscription_plans';

update public.platform_settings
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          value,
          '{subscriptionPlans,PRO,limits}',
          '{
            "aiLifetimeDemoCredits":0,
            "aiCreditsDaily":15,
            "aiCreditsMonthly":300,
            "premiumAiMonthly":0,
            "quizDaily":10,
            "ocrPrintedMonthly":100,
            "universityHubWeekly":10,
            "liveVoiceDaily":0,
            "flashcardsTotal":1000,
            "gameMinutesDaily":45,
            "parentGuardiansMax":1,
            "parentAttachmentFilesMonthly":10,
            "parentAttachmentMegabytesMonthly":20
          }'::jsonb,
          true
        ),
        '{subscriptionPlans,PRO,audienceLimits}',
        '{
          "school":{"ocrHandwrittenMonthly":20,"presentationsMonthly":1,"presentationSlidesMax":8,"fileSummariesMonthly":8,"fileTestsMonthly":8},
          "college":{"ocrHandwrittenMonthly":15,"presentationsMonthly":2,"presentationSlidesMax":8,"fileSummariesMonthly":10,"fileTestsMonthly":6},
          "university":{"ocrHandwrittenMonthly":10,"presentationsMonthly":4,"presentationSlidesMax":8,"fileSummariesMonthly":15,"fileTestsMonthly":4}
        }'::jsonb,
        true
      ),
      '{subscriptionPlans,PRO,access}',
      '{
        "pastPapers":true,"downloadPDF":true,"studentChat":true,"liveVoice":false,
        "prioritySupport":true,"adsFree":true,"games":true,"restPlaylists":true,
        "parentDashboard":true,"advancedParentAnalytics":false,"parentReports":true
      }'::jsonb,
      true
    ),
    '{subscriptionPlans,PRO,features}',
    '[
      "300 shared AI credits/month, max 15/day",
      "Groq/DeepSeek budget AI routing",
      "100 printed OCR scans/month",
      "School: 20 handwritten scans and 8 file tests/month",
      "University: 4 presentations and 15 file summaries/month",
      "Downloads, offline reading, and ad-free access",
      "1 guardian with cached weekly report",
      "10 attachments or 20 MB/month"
    ]'::jsonb,
    true
  ),
  updated_at = now()
where key = 'subscription_plans';

update public.platform_settings
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          value,
          '{subscriptionPlans,ELITE,limits}',
          '{
            "aiLifetimeDemoCredits":0,
            "aiCreditsDaily":30,
            "aiCreditsMonthly":600,
            "premiumAiMonthly":10,
            "quizDaily":25,
            "ocrPrintedMonthly":300,
            "universityHubWeekly":25,
            "liveVoiceDaily":0,
            "flashcardsTotal":5000,
            "gameMinutesDaily":45,
            "parentGuardiansMax":2,
            "parentAttachmentFilesMonthly":30,
            "parentAttachmentMegabytesMonthly":100
          }'::jsonb,
          true
        ),
        '{subscriptionPlans,ELITE,audienceLimits}',
        '{
          "school":{"ocrHandwrittenMonthly":50,"presentationsMonthly":2,"presentationSlidesMax":12,"fileSummariesMonthly":20,"fileTestsMonthly":16},
          "college":{"ocrHandwrittenMonthly":35,"presentationsMonthly":4,"presentationSlidesMax":12,"fileSummariesMonthly":25,"fileTestsMonthly":12},
          "university":{"ocrHandwrittenMonthly":25,"presentationsMonthly":8,"presentationSlidesMax":12,"fileSummariesMonthly":35,"fileTestsMonthly":10}
        }'::jsonb,
        true
      ),
      '{subscriptionPlans,ELITE,access}',
      '{
        "pastPapers":true,"downloadPDF":true,"studentChat":true,"liveVoice":false,
        "prioritySupport":true,"adsFree":true,"games":true,"restPlaylists":true,
        "parentDashboard":true,"advancedParentAnalytics":true,"parentReports":true
      }'::jsonb,
      true
    ),
    '{subscriptionPlans,ELITE,features}',
    '[
      "600 shared AI credits/month, max 30/day",
      "10 premium AI calls/month, budget model by default",
      "300 printed OCR scans/month",
      "School: 50 handwritten scans and 16 file tests/month",
      "University: 8 presentations and 35 file summaries/month",
      "Downloads, offline reading, and ad-free access",
      "2 guardians with detailed weekly insights",
      "30 attachments or 100 MB/month"
    ]'::jsonb,
    true
  ),
  updated_at = now()
where key = 'subscription_plans';
