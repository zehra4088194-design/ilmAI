-- Logs incoming WhatsApp messages received by the Baileys bot (whatsapp-worker/) so a human can
-- review what people are asking on WhatsApp — the bot itself only sends a canned auto-reply, it
-- doesn't resolve real support requests. Written by the worker with the service-role key (bypasses
-- RLS below), so there's no insert/update policy for regular users — only platform admins can read
-- it from the app if a review UI is ever built on top.

create table if not exists public.whatsapp_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  phone_digits text,
  profile_id uuid references public.profiles(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_inbound_messages_profile_idx
  on public.whatsapp_inbound_messages (profile_id, created_at desc);
create index if not exists whatsapp_inbound_messages_created_idx
  on public.whatsapp_inbound_messages (created_at desc);

alter table public.whatsapp_inbound_messages enable row level security;

create policy "platform admins read whatsapp inbound messages"
  on public.whatsapp_inbound_messages for select
  using (public.school_is_platform_admin());
