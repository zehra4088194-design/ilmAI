-- Phase 7b: referral system. Two small tables — one code per user (generated lazily on first
-- request, reused for every referral) and one row per successful referral signup, so a single
-- code can be used by many referees without the code itself ever changing.

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  -- unique: a profile can only ever be someone's referee once, across the platform.
  referee_id uuid not null unique references public.profiles(id) on delete cascade,
  code_used text not null,
  status text not null default 'pending' check (status in ('pending', 'converted')),
  reward_granted boolean not null default false,
  created_at timestamptz not null default now(),
  converted_at timestamptz,
  check (referrer_id <> referee_id)
);

create index if not exists referral_signups_referrer_idx on public.referral_signups (referrer_id);

alter table public.referral_codes enable row level security;
alter table public.referral_signups enable row level security;

drop policy if exists "users create own referral code" on public.referral_codes;
create policy "users create own referral code"
  on public.referral_codes for insert
  with check (auth.uid() = owner_id);

-- Codes are looked up by an unauthenticated/newly-signing-up user to validate a ?ref= code before
-- their own profile exists yet — so the code string itself (not the owner's identity) must be
-- publicly readable. Nothing sensitive is exposed (just the code + owner id, already public via
-- the referrer sharing their own code).
drop policy if exists "anyone can look up a referral code" on public.referral_codes;
create policy "anyone can look up a referral code"
  on public.referral_codes for select
  using (true);

drop policy if exists "users read own referral signups" on public.referral_signups;
create policy "users read own referral signups"
  on public.referral_signups for select
  using (auth.uid() = referrer_id or auth.uid() = referee_id);
