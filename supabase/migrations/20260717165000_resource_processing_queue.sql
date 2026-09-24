-- One-time OCR queue and private text sidecars for library resources.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resource-context', 'resource-context', false, 5242880, array['text/plain'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lecture-thumbnails', 'lecture-thumbnails', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.resource_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('library', 'past-paper', 'college-resource')),
  resource_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_kind, resource_id)
);

create index if not exists idx_resource_processing_jobs_status_created
  on public.resource_processing_jobs (status, created_at);

alter table public.resource_processing_jobs enable row level security;

-- There are intentionally no browser policies. The service role owns queue and sidecar access.
