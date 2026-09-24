create extension if not exists "uuid-ossp";

insert into storage.buckets (id, name, public)
values
  ('vision-scans', 'vision-scans', false),
  ('speaking-practice-audio', 'speaking-practice-audio', false)
on conflict (id) do update set public = excluded.public;

create table if not exists public.vision_scans (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  scan_type text not null check (scan_type in ('textbook_page','handwritten','diagram','math','chemistry','biology')),
  image_url text not null,
  ocr_text text,
  ai_explanation text,
  language text not null default 'en' check (language in ('en','ur','hi')),
  chapter_id uuid references public.chapters(id),
  created_at timestamptz not null default now()
);

alter table public.vision_scans enable row level security;

drop policy if exists "student manages own scans" on public.vision_scans;
create policy "student manages own scans" on public.vision_scans
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.speaking_practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  language text not null check (language in ('en','ur','hi')),
  prompt_text text not null,
  audio_url text,
  transcript text,
  pronunciation_score numeric,
  ai_feedback text,
  created_at timestamptz not null default now()
);

alter table public.speaking_practice_sessions enable row level security;

drop policy if exists "student manages own speaking sessions" on public.speaking_practice_sessions;
create policy "student manages own speaking sessions" on public.speaking_practice_sessions
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.research_projects (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  topic text,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_sources (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  title text,
  authors text,
  source_url text,
  summary text,
  citation_apa text,
  citation_mla text,
  added_at timestamptz not null default now()
);

alter table public.research_projects enable row level security;
alter table public.research_sources enable row level security;

drop policy if exists "student manages own research" on public.research_projects;
create policy "student manages own research" on public.research_projects
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "student manages own sources" on public.research_sources;
create policy "student manages own sources" on public.research_sources
  for all using (
    exists (
      select 1 from public.research_projects p
      where p.id = research_sources.project_id and p.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.research_projects p
      where p.id = research_sources.project_id and p.student_id = auth.uid()
    )
  );

create table if not exists public.ai_projects (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  one_liner text not null,
  generated_content jsonb not null,
  status text not null default 'draft' check (status in ('draft','final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_projects enable row level security;

drop policy if exists "student manages own projects" on public.ai_projects;
create policy "student manages own projects" on public.ai_projects
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.offline_download_log (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('note','textbook','mcq_set','video','assignment','ai_summary')),
  resource_id uuid not null,
  downloaded_at timestamptz not null default now(),
  device_hint text
);

alter table public.offline_download_log enable row level security;

drop policy if exists "student manages own download log" on public.offline_download_log;
create policy "student manages own download log" on public.offline_download_log
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "students upload own vision scans" on storage.objects;
create policy "students upload own vision scans" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vision-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "students read own vision scans" on storage.objects;
create policy "students read own vision scans" on storage.objects
  for select to authenticated
  using (bucket_id = 'vision-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "students upload own speaking audio" on storage.objects;
create policy "students upload own speaking audio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'speaking-practice-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "students read own speaking audio" on storage.objects;
create policy "students read own speaking audio" on storage.objects
  for select to authenticated
  using (bucket_id = 'speaking-practice-audio' and (storage.foldername(name))[1] = auth.uid()::text);
