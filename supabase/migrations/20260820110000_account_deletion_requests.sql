-- Account deletion flow with OTP confirmation
-- Users can request account deletion, receive an OTP via email, and confirm deletion

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  otp text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id)
);

create index if not exists account_deletion_requests_user_id_idx on public.account_deletion_requests(user_id);
create index if not exists account_deletion_requests_expires_at_idx on public.account_deletion_requests(expires_at);

alter table public.account_deletion_requests enable row level security;

-- Users can only see their own deletion request
drop policy if exists "users see own deletion request" on public.account_deletion_requests;
create policy "users see own deletion request" on public.account_deletion_requests
  for select using (auth.uid() = user_id);

-- Only system/service can insert/update/delete (no direct user access)
drop policy if exists "service manages deletion requests" on public.account_deletion_requests;
create policy "service manages deletion requests" on public.account_deletion_requests
  for all using (false)
  with check (false);
