create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "Service role manages platform settings" on public.platform_settings;
create policy "Service role manages platform settings"
  on public.platform_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.platform_settings (key, value)
values (
  'subscription_plans',
  '{
    "subscriptionPlans": {
      "FREE": {
        "tier": "FREE",
        "name": "Free",
        "enabled": true,
        "price": { "PKR": { "monthly": 0, "annual": 0 }, "INR": { "monthly": 0, "annual": 0 } },
        "limits": { "aiSideChatDaily": 10, "aiToolDaily": 3, "quizDaily": 3, "ocrPrintedWeekly": 10, "ocrHandwrittenWeekly": 5, "universityHubWeekly": 3, "liveVoiceDaily": 0, "flashcardsTotal": 50 },
        "access": { "pastPapers": true, "downloadPDF": false, "studentChat": false, "liveVoice": false, "prioritySupport": false, "adsFree": false },
        "features": ["10 side-chat messages/day", "3/day preview for AI tools and testing", "10 printed and 5 handwritten scans/week", "3 University Hub uses/week", "Read notes/books in-app", "No PDF downloads", "Student chat requests only"]
      },
      "PRO": {
        "tier": "PRO",
        "name": "Pro",
        "enabled": true,
        "price": { "PKR": { "monthly": 500, "annual": 4800 }, "INR": { "monthly": 149, "annual": 1499 } },
        "limits": { "aiSideChatDaily": 20, "aiToolDaily": 20, "quizDaily": 20, "ocrPrintedWeekly": -1, "ocrHandwrittenWeekly": 50, "universityHubWeekly": -1, "liveVoiceDaily": 0, "flashcardsTotal": 1000 },
        "access": { "pastPapers": true, "downloadPDF": true, "studentChat": true, "liveVoice": false, "prioritySupport": true, "adsFree": true },
        "features": ["20/day for every AI tool", "20/day AI testing, essays and tutor", "Unlimited OCR.space printed scans and 50 handwritten scans/week", "1000 flashcards", "All past papers", "PDF downloads unlocked", "Student chat unlocked", "Parent weekly reports and chat", "Priority support"]
      },
      "ELITE": {
        "tier": "ELITE",
        "name": "Elite",
        "enabled": true,
        "price": { "PKR": { "monthly": 800, "annual": 7680 }, "INR": { "monthly": 299, "annual": 2999 } },
        "limits": { "aiSideChatDaily": 50, "aiToolDaily": 50, "quizDaily": 50, "ocrPrintedWeekly": 200, "ocrHandwrittenWeekly": 100, "universityHubWeekly": -1, "liveVoiceDaily": 50, "flashcardsTotal": -1 },
        "access": { "pastPapers": true, "downloadPDF": true, "studentChat": true, "liveVoice": true, "prioritySupport": true, "adsFree": true },
        "features": ["50/day for every AI tool", "50/day AI testing, essays and tutor", "Offline mode", "Elite-only Live Voice Call", "Pro AI model tier", "200 printed and 100 handwritten scans/week", "Elite parent insights", "Exam simulations", "Parent dashboard"]
      }
    }
  }'::jsonb
)
on conflict (key) do nothing;
