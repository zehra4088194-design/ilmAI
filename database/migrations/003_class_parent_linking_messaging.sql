-- ============================================
-- MIGRATION: Class field, Parent<->Student linking, Messaging, Routine Tests
-- ============================================

-- 1. Student's class/grade — asked once at signup, editable only from Settings.
alter table public.profiles add column if not exists class text;

-- 2. Each student gets a short shareable code so a parent can link to them
--    from the Parent Dashboard. Generated on-demand from Settings.
alter table public.profiles add column if not exists parent_link_code text unique;

-- 3. Parent <-> Student link table (a parent can link multiple students;
--    in most cases just one, but this supports more than one child).
create table if not exists public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table public.parent_student_links enable row level security;

create policy "Parents can view their own links"
  on public.parent_student_links for select
  using (auth.uid() = parent_id or auth.uid() = student_id);

create policy "Parents can create links"
  on public.parent_student_links for insert
  with check (auth.uid() = parent_id);

create policy "Parents can remove their own links"
  on public.parent_student_links for delete
  using (auth.uid() = parent_id);

-- 4. Live messaging between a linked parent and student.
create table if not exists public.parent_messages (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.parent_student_links(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.parent_messages enable row level security;

create policy "Participants can view their messages"
  on public.parent_messages for select
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.id = link_id and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.parent_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.parent_student_links l
      where l.id = link_id and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

-- Enable realtime for live chat
alter publication supabase_realtime add table public.parent_messages;

-- 5. Routine tests — scheduled tests shown on both the student's routine
--    and the parent dashboard.
create table if not exists public.routine_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null default 'upcoming', -- upcoming | completed | missed
  score numeric,
  created_at timestamptz not null default now()
);

alter table public.routine_tests enable row level security;

create policy "Students manage their own routine tests"
  on public.routine_tests for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Linked parents can view routine tests"
  on public.routine_tests for select
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_id = routine_tests.student_id and l.parent_id = auth.uid()
    )
  );

comment on column public.profiles.class is 'Student''s class/grade, captured once at signup, editable only from Settings';
comment on column public.profiles.parent_link_code is 'Short code a parent enters to link their account to this student';
