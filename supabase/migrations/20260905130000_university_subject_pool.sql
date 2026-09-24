-- Turns university_subjects from "owned by exactly one program_year" into a shared
-- pool: the same subject (e.g. "Pharmacology", "Anatomy") can now be linked to many
-- program-years across different degree programs, and its resources/MCQs (which key
-- off subject_id, unchanged by this migration) are then automatically shared by every
-- program-year that links it — add the notes/MCQs once, not once per program.
--
-- The link is a many-to-many join table instead of the old scalar program_year_id
-- column, mirroring how every other "which parent(s) does this belong to" relationship
-- in this schema is modeled. program_year_id itself is kept (now nullable) rather than
-- dropped, purely as a cheap breadcrumb of each subject's original year — no code path
-- reads or writes it after this migration.

create table if not exists public.university_program_year_subjects (
  id uuid primary key default gen_random_uuid(),
  program_year_id uuid not null references public.university_program_years(id) on delete cascade,
  subject_id uuid not null references public.university_subjects(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (program_year_id, subject_id)
);

-- Backfill: every existing subject's current program_year_id becomes its first link
-- row, so no subject already on the platform loses its year.
insert into public.university_program_year_subjects (program_year_id, subject_id, sort_order)
select program_year_id, id, sort_order
from public.university_subjects
where program_year_id is not null
on conflict (program_year_id, subject_id) do nothing;

alter table public.university_subjects alter column program_year_id drop not null;

create index if not exists idx_university_pys_year on public.university_program_year_subjects (program_year_id);
create index if not exists idx_university_pys_subject on public.university_program_year_subjects (subject_id);

alter table public.university_program_year_subjects enable row level security;

create policy "University program-year subject links are viewable by everyone"
  on public.university_program_year_subjects for select using (true);
