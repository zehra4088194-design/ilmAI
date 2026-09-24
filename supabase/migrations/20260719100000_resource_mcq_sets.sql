-- Every processed library/past-paper/college resource gets a cached,
-- source-grounded set of 30 MCQs. The PDF remains a separate reader surface.

create table if not exists public.resource_mcq_sets (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('library', 'past-paper', 'college-resource')),
  resource_id uuid not null,
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'ready' check (status in ('queued', 'processing', 'ready', 'failed')),
  error_message text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_kind, resource_id)
);

create index if not exists resource_mcq_sets_lookup_idx
  on public.resource_mcq_sets (resource_kind, resource_id, status);

alter table public.resource_mcq_sets enable row level security;

drop policy if exists "Authenticated users read resource mcqs" on public.resource_mcq_sets;
create policy "Authenticated users read resource mcqs"
  on public.resource_mcq_sets for select to authenticated using (true);

-- Backfill the worker queue for resources uploaded before this migration.
insert into public.resource_processing_jobs (resource_kind, resource_id, status, attempts, updated_at)
select 'library', r.id, 'queued', 0, now()
from public.library_resources r
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = 'library' and q.resource_id = r.id
)
on conflict (resource_kind, resource_id) do update
set status = 'queued', attempts = 0, last_error = null, locked_at = null, completed_at = null, updated_at = now()
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = excluded.resource_kind and q.resource_id = excluded.resource_id
);

insert into public.resource_processing_jobs (resource_kind, resource_id, status, attempts, updated_at)
select 'past-paper', r.id, 'queued', 0, now()
from public.past_papers r
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = 'past-paper' and q.resource_id = r.id
)
on conflict (resource_kind, resource_id) do update
set status = 'queued', attempts = 0, last_error = null, locked_at = null, completed_at = null, updated_at = now()
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = excluded.resource_kind and q.resource_id = excluded.resource_id
);

insert into public.resource_processing_jobs (resource_kind, resource_id, status, attempts, updated_at)
select 'college-resource', r.id, 'queued', 0, now()
from public.college_resources r
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = 'college-resource' and q.resource_id = r.id
)
on conflict (resource_kind, resource_id) do update
set status = 'queued', attempts = 0, last_error = null, locked_at = null, completed_at = null, updated_at = now()
where not exists (
  select 1 from public.resource_mcq_sets q
  where q.resource_kind = excluded.resource_kind and q.resource_id = excluded.resource_id
);
