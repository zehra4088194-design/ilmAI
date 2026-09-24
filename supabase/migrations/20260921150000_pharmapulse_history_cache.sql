create table if not exists public.pharmapulse_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medicine_key text not null,
  medicine_name text not null,
  lookup_terms text[] not null default '{}'::text[],
  results_by_mode jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pharmapulse_history_user_medicine_unique unique (user_id, medicine_key)
);

create index if not exists pharmapulse_history_user_updated_idx
  on public.pharmapulse_history (user_id, updated_at desc);

create index if not exists pharmapulse_history_lookup_terms_idx
  on public.pharmapulse_history using gin (lookup_terms);

alter table public.pharmapulse_history enable row level security;

drop policy if exists "pharmapulse_history_select_own" on public.pharmapulse_history;
create policy "pharmapulse_history_select_own"
  on public.pharmapulse_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "pharmapulse_history_insert_own" on public.pharmapulse_history;
create policy "pharmapulse_history_insert_own"
  on public.pharmapulse_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "pharmapulse_history_update_own" on public.pharmapulse_history;
create policy "pharmapulse_history_update_own"
  on public.pharmapulse_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pharmapulse_history_delete_own" on public.pharmapulse_history;
create policy "pharmapulse_history_delete_own"
  on public.pharmapulse_history
  for delete
  to authenticated
  using (auth.uid() = user_id);
