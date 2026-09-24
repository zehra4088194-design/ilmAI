-- Learning-system foundations: curriculum graph, source-grounded reader,
-- past-paper intelligence, mistakes, spaced revision, and importer review.

create table if not exists public.curriculum_concepts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  board text,
  grade_level text,
  slo_code text,
  title text not null,
  description text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (chapter_id, slo_code),
  unique (chapter_id, title)
);

create table if not exists public.curriculum_prerequisites (
  concept_id uuid not null references public.curriculum_concepts(id) on delete cascade,
  prerequisite_concept_id uuid not null references public.curriculum_concepts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (concept_id, prerequisite_concept_id),
  check (concept_id <> prerequisite_concept_id)
);

create table if not exists public.resource_source_chunks (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in ('library', 'past-paper', 'college-resource')),
  resource_id uuid not null,
  concept_id uuid references public.curriculum_concepts(id) on delete set null,
  page_number integer,
  chunk_index integer not null default 0,
  heading text,
  text text not null,
  confidence numeric(5,2) not null default 80 check (confidence between 0 and 100),
  created_at timestamptz not null default now(),
  unique (resource_kind, resource_id, chunk_index)
);

create table if not exists public.resource_concept_links (
  resource_kind text not null check (resource_kind in ('library', 'past-paper', 'college-resource', 'lecture', 'question', 'ai-conversation')),
  resource_id uuid not null,
  concept_id uuid not null references public.curriculum_concepts(id) on delete cascade,
  confidence numeric(5,2) not null default 80 check (confidence between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (resource_kind, resource_id, concept_id)
);

alter table public.questions
  add column if not exists concept_id uuid references public.curriculum_concepts(id) on delete set null,
  add column if not exists slo_code text,
  add column if not exists year integer,
  add column if not exists marks integer,
  add column if not exists source_kind text,
  add column if not exists source_id uuid,
  add column if not exists question_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.past_papers
  add column if not exists source_kind text not null default 'pdf',
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'queued', 'processing', 'review', 'approved', 'failed')),
  add column if not exists extracted_question_count integer not null default 0;

create table if not exists public.past_paper_questions (
  id uuid primary key default gen_random_uuid(),
  past_paper_id uuid not null references public.past_papers(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  concept_id uuid references public.curriculum_concepts(id) on delete set null,
  year integer,
  board text,
  question_type text not null check (question_type in ('mcq', 'short', 'long', 'numerical', 'other')),
  text text not null,
  options jsonb,
  correct_answer text,
  marks integer,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  page_number integer,
  source_excerpt text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.student_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  past_paper_question_id uuid references public.past_paper_questions(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  concept_id uuid references public.curriculum_concepts(id) on delete set null,
  source text not null default 'practice',
  question_text text not null,
  selected_answer text,
  correct_answer text,
  explanation text,
  status text not null default 'needs_revision'
    check (status in ('needs_revision', 'scheduled', 'reviewed', 'mastered')),
  created_at timestamptz not null default now(),
  last_reviewed_at timestamptz
);

create table if not exists public.student_revision_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  mistake_id uuid references public.student_mistakes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  concept_id uuid references public.curriculum_concepts(id) on delete set null,
  title text not null,
  prompt text not null,
  due_at timestamptz not null,
  interval_days integer not null default 1,
  status text not null default 'due' check (status in ('due', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.chapter_mastery
  add column if not exists status text not null default 'not_started'
    check (status in ('not_started', 'learning', 'practiced', 'mastered', 'needs_revision')),
  add column if not exists correct_count integer not null default 0,
  add column if not exists incorrect_count integer not null default 0,
  add column if not exists source_signals jsonb not null default '{}'::jsonb;

alter table public.library_resources
  add column if not exists importer_status text not null default 'pending'
    check (importer_status in ('pending', 'queued', 'processing', 'review', 'approved', 'failed')),
  add column if not exists importer_notes text,
  add column if not exists extracted_chunk_count integer not null default 0;

alter table public.lectures
  add column if not exists concept_id uuid references public.curriculum_concepts(id) on delete set null;

create index if not exists curriculum_concepts_scope_idx on public.curriculum_concepts(subject_id, chapter_id, board, grade_level);
create index if not exists resource_source_chunks_lookup_idx on public.resource_source_chunks(resource_kind, resource_id, page_number);
create index if not exists past_paper_questions_lookup_idx on public.past_paper_questions(subject_id, chapter_id, concept_id, year, question_type, difficulty);
create index if not exists student_mistakes_student_idx on public.student_mistakes(student_id, status, created_at desc);
create index if not exists student_revision_due_idx on public.student_revision_items(student_id, status, due_at);
create index if not exists questions_concept_idx on public.questions(concept_id, year, question_type);

alter table public.curriculum_concepts enable row level security;
alter table public.curriculum_prerequisites enable row level security;
alter table public.resource_source_chunks enable row level security;
alter table public.resource_concept_links enable row level security;
alter table public.past_paper_questions enable row level security;
alter table public.student_mistakes enable row level security;
alter table public.student_revision_items enable row level security;

drop policy if exists public_read_curriculum_concepts on public.curriculum_concepts;
create policy public_read_curriculum_concepts on public.curriculum_concepts for select using (true);

drop policy if exists public_read_curriculum_prerequisites on public.curriculum_prerequisites;
create policy public_read_curriculum_prerequisites on public.curriculum_prerequisites for select using (true);

drop policy if exists authenticated_read_resource_chunks on public.resource_source_chunks;
create policy authenticated_read_resource_chunks on public.resource_source_chunks for select to authenticated using (true);

drop policy if exists authenticated_read_resource_concepts on public.resource_concept_links;
create policy authenticated_read_resource_concepts on public.resource_concept_links for select to authenticated using (true);

drop policy if exists public_read_verified_past_paper_questions on public.past_paper_questions;
create policy public_read_verified_past_paper_questions on public.past_paper_questions
  for select using (is_verified = true);

drop policy if exists students_manage_own_mistakes on public.student_mistakes;
create policy students_manage_own_mistakes on public.student_mistakes
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists students_manage_own_revision_items on public.student_revision_items;
create policy students_manage_own_revision_items on public.student_revision_items
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
