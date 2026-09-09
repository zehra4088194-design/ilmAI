-- Per-phone-number state for the WhatsApp AI auto-reply (src/app/api/whatsapp/ai-reply,
-- whatsapp-worker/index.js). One row per number: `history` carries the last few turns so Groq
-- replies stay coherent across messages, `status` flips to 'closed' once the bot has told someone
-- "the CEO will personally follow up" — after that the worker stops auto-replying to that number
-- entirely (still logs incoming messages via whatsapp_inbound_messages, just doesn't respond).
-- Mirrors the migration already applied to the remote project via the Supabase MCP tool
-- (apply_migration name: whatsapp_ai_conversations).

create table if not exists public.whatsapp_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  phone_digits text not null unique,
  profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed')),
  -- [{role: 'user'|'assistant', content: text}, ...] — trimmed to the last ~12 entries by the
  -- endpoint before every write, so this never grows unbounded.
  history jsonb not null default '[]'::jsonb,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_ai_conversations_status_idx
  on public.whatsapp_ai_conversations (status);

alter table public.whatsapp_ai_conversations enable row level security;
create policy "platform admins read whatsapp ai conversations"
  on public.whatsapp_ai_conversations for select
  using (public.school_is_platform_admin());
