alter table public.profiles add column if not exists coins integer not null default 0;

create table if not exists public.coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

alter table public.coin_transactions enable row level security;

drop policy if exists "user reads own coin history" on public.coin_transactions;
create policy "user reads own coin history" on public.coin_transactions
  for select using (auth.uid() = user_id);

create or replace function public.increment_coins(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  update public.profiles
  set coins = greatest(0, coins + p_amount),
      updated_at = now()
  where id = p_user_id
  returning coins into v_balance;

  return coalesce(v_balance, 0);
end;
$$;

create index if not exists idx_coin_transactions_user_created
  on public.coin_transactions(user_id, created_at desc);
