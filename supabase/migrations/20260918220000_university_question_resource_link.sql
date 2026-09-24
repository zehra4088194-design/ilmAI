alter table public.university_questions
  add column if not exists resource_id uuid references public.university_subject_resources(id) on delete set null;

create index if not exists idx_university_questions_resource
  on public.university_questions(resource_id);

create table if not exists public.university_resource_contents (
  resource_id uuid primary key references public.university_subject_resources(id) on delete cascade,
  content text not null,
  source_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.university_resource_contents enable row level security;

drop policy if exists "University resource contents are viewable by everyone"
  on public.university_resource_contents;
create policy "University resource contents are viewable by everyone"
  on public.university_resource_contents for select using (true);
