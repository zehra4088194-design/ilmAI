-- Switch Profile / "Linked Accounts": lets a person who controls two separate ilm AI accounts
-- (e.g. their own student account and their own teacher account — each a normal, independent
-- profile with its own working RLS, nothing decoupled) register that both belong to them, then
-- switch between the two real sessions from Settings after re-confirming a password each time.
-- One symmetric row per linked pair (either party can see/delete it) rather than two mirrored
-- rows or a directional-only row — see referral_signups' identical
-- `auth.uid() = referrer_id or auth.uid() = referee_id` precedent.
--
-- Deliberately NO insert/update policy for `authenticated`:
--   - No client-facing UPDATE policy: failed_attempts/locked_until must only ever be mutated by
--     linked_accounts_record_switch_attempt() below (security definer, re-checks auth.uid() itself)
--     — a normal UPDATE policy would let anyone reset their own lockout straight from devtools.
--   - No client-facing INSERT policy: rows are only ever created server-side (via the
--     service-role admin client) AFTER the linking API route has independently verified the
--     target account's password through a throwaway/ephemeral client — a normal INSERT policy
--     would let anyone claim a stranger as linked_profile_id without ever proving they know that
--     stranger's password.
create table if not exists public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  linked_profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Denormalized DISPLAY-ONLY snapshot captured at link time — never used for authorization.
  -- Both link and switch requests re-check the live profiles.role before granting access, since
  -- either side's role could change after this row was created.
  owner_masked_email text not null,
  owner_role public.user_role not null,
  owner_full_name text,
  linked_masked_email text not null,
  linked_role public.user_role not null,
  linked_full_name text,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  last_switched_at timestamptz,
  created_at timestamptz not null default now(),
  check (owner_profile_id <> linked_profile_id),
  check (owner_role <> 'principal' and linked_role <> 'principal')
);

create index if not exists linked_accounts_owner_idx on public.linked_accounts (owner_profile_id);
create index if not exists linked_accounts_linked_idx on public.linked_accounts (linked_profile_id);
-- Prevents a duplicate row for the same unordered pair regardless of which side re-links first.
create unique index if not exists linked_accounts_pair_uidx
  on public.linked_accounts (least(owner_profile_id, linked_profile_id), greatest(owner_profile_id, linked_profile_id));

alter table public.linked_accounts enable row level security;

drop policy if exists "either party reads a linked account" on public.linked_accounts;
create policy "either party reads a linked account"
  on public.linked_accounts for select
  using (auth.uid() = owner_profile_id or auth.uid() = linked_profile_id);

drop policy if exists "either party deletes a linked account" on public.linked_accounts;
create policy "either party deletes a linked account"
  on public.linked_accounts for delete
  using (auth.uid() = owner_profile_id or auth.uid() = linked_profile_id);

-- The only path that can ever touch failed_attempts/locked_until/last_switched_at. Re-checks
-- auth.uid() itself (rather than relying on RLS) since granting EXECUTE to `authenticated` alone
-- would otherwise let anyone call this against an arbitrary p_link_id.
create or replace function public.linked_accounts_record_switch_attempt(
  p_link_id uuid,
  p_success boolean
)
returns public.linked_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.linked_accounts;
  updated_row public.linked_accounts;
begin
  select * into current_row from public.linked_accounts where id = p_link_id;
  if current_row is null then
    raise exception 'Linked account not found';
  end if;
  if auth.uid() is distinct from current_row.owner_profile_id
     and auth.uid() is distinct from current_row.linked_profile_id then
    raise exception 'Not authorized for this linked account';
  end if;

  if p_success then
    update public.linked_accounts
       set failed_attempts = 0, locked_until = null, last_switched_at = now()
     where id = p_link_id
    returning * into updated_row;
  else
    update public.linked_accounts
       set failed_attempts = current_row.failed_attempts + 1,
           locked_until = case when current_row.failed_attempts + 1 >= 5
                               then now() + interval '15 minutes'
                               else current_row.locked_until end
     where id = p_link_id
    returning * into updated_row;
  end if;
  return updated_row;
end;
$$;

revoke all on function public.linked_accounts_record_switch_attempt(uuid, boolean) from public;
grant execute on function public.linked_accounts_record_switch_attempt(uuid, boolean) to authenticated;
