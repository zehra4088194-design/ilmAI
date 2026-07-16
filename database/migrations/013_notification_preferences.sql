-- User-controlled notification preferences for in-app alerts and study email.

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{
    "browserNotifications": true,
    "studyReminders": true,
    "weakSubjectAlerts": true,
    "routineTestAlerts": true,
    "parentMessages": true,
    "studentChat": true,
    "achievements": true,
    "dailyStudyEmails": false
  }'::jsonb;
