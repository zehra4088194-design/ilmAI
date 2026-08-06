create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('library', 'past-paper', 'college-resource')),
  resource_id uuid not null,
  parent_id uuid references public.resource_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 1200),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resource_comments_resource_idx
  on public.resource_comments (resource_kind, resource_id, created_at desc);

create index if not exists resource_comments_parent_idx
  on public.resource_comments (parent_id, created_at);

alter table public.resource_comments enable row level security;

drop policy if exists "visible resource comments are public" on public.resource_comments;
create policy "visible resource comments are public"
  on public.resource_comments for select
  using (status = 'visible');

drop policy if exists "signed in users create resource comments" on public.resource_comments;
create policy "signed in users create resource comments"
  on public.resource_comments for insert
  with check (auth.uid() = user_id and status = 'visible');

drop policy if exists "comment owners can edit their comments" on public.resource_comments;
create policy "comment owners can edit their comments"
  on public.resource_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.resource_comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
