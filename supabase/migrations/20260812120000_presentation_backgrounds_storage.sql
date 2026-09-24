-- Move presentation background images off the local/container filesystem and into
-- a private Supabase Storage bucket, with metadata tracked in Postgres instead of
-- JSON sidecar files. All access goes through the service-role key server-side
-- (the app proxies bytes via /api/presentation/backgrounds/[name]), so no public
-- storage policies are needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ilmai-presentations',
  'ilmai-presentations',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.presentation_backgrounds (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  subject text not null default '',
  keywords text[] not null default '{}',
  category text not null default 'uncategorized',
  is_global boolean not null default false,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.presentation_backgrounds is
  'Metadata for images in the private ilmai-presentations storage bucket. Rows are the source of truth for the presentation-builder background picker; served through /api/presentation/backgrounds/[name] using the service-role key.';

alter table public.presentation_backgrounds enable row level security;

-- Service-role key bypasses RLS entirely (this table is only ever touched from
-- server code), so no policies are defined — that is intentional, not an oversight.
