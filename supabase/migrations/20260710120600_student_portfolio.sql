create table if not exists public.portfolio_settings (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  is_public boolean not null default false,
  public_slug text unique,
  headline text,
  bio text,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_settings enable row level security;

drop policy if exists "student manages own portfolio settings" on public.portfolio_settings;
create policy "student manages own portfolio settings" on public.portfolio_settings
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "public reads public portfolios" on public.portfolio_settings;
create policy "public reads public portfolios" on public.portfolio_settings
  for select using (is_public = true);
