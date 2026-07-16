alter table public.profiles
  add column if not exists username text,
  add column if not exists sponsored_institution_name text,
  add column if not exists sponsored_institution_type text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.institution_plan_inquiries (
  id uuid primary key default uuid_generate_v4(),
  contact_user_id uuid references public.profiles(id) on delete set null,
  institution_name text not null,
  institution_type text not null check (institution_type in ('school', 'college')),
  student_count integer not null check (student_count > 0),
  discounted_price_pkr integer not null,
  contact_name text,
  contact_email text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.institution_plan_inquiries
  add column if not exists plan_tier text not null default 'PRO' check (plan_tier in ('PRO', 'ELITE')),
  add column if not exists billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual'));

create index if not exists institution_plan_inquiries_created_idx
  on public.institution_plan_inquiries (created_at desc);

alter table public.institution_plan_inquiries enable row level security;

drop policy if exists "Users create their own institution inquiries" on public.institution_plan_inquiries;
create policy "Users create their own institution inquiries"
  on public.institution_plan_inquiries
  for insert
  with check (contact_user_id = auth.uid());

drop policy if exists "Users view their own institution inquiries" on public.institution_plan_inquiries;
create policy "Users view their own institution inquiries"
  on public.institution_plan_inquiries
  for select
  using (contact_user_id = auth.uid());
