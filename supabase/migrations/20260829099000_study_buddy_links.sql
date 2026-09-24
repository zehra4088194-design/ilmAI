-- Phase 5a: study buddy links — same invite-code pattern as parent_student_links (generate a
-- code, the other side redeems it), but symmetric (either party can be "requester", there's no
-- parent/child directionality) and capped to a simple pending -> accepted lifecycle.

create table if not exists public.buddy_links (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  buddy_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invite_code text unique,
  invite_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  check (requester_id <> buddy_id)
);

create index if not exists buddy_links_requester_idx on public.buddy_links (requester_id, status);
create index if not exists buddy_links_buddy_idx on public.buddy_links (buddy_id, status);

alter table public.buddy_links enable row level security;

drop policy if exists "users read own buddy links" on public.buddy_links;
create policy "users read own buddy links"
  on public.buddy_links for select
  using (auth.uid() = requester_id or auth.uid() = buddy_id);

drop policy if exists "users create own buddy invite" on public.buddy_links;
create policy "users create own buddy invite"
  on public.buddy_links for insert
  with check (auth.uid() = requester_id);

drop policy if exists "requester cancels own pending buddy invite" on public.buddy_links;
create policy "requester cancels own pending buddy invite"
  on public.buddy_links for delete
  using (auth.uid() = requester_id and status = 'pending');
