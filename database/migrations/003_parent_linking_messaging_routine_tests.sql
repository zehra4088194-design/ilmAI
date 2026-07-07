-- ============================================
-- MIGRATION 003 (CORRECTED): Parent<->Student linking (finally creates the
-- table your existing /api/parent/generate-invite and /api/parent/accept-invite
-- routes already expect — it was referenced in code but never migrated),
-- Parent<->Student live messaging, Routine Tests, and Indian board support.
-- ============================================

-- 1. Parent <-> Student link table — schema matches exactly what
--    accept-invite/route.ts already writes (id via nanoid = text, not uuid).
create table if not exists public.parent_student_links (
  id text primary key,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'approved'
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table public.parent_student_links enable row level security;

create policy "Parties can view their own links"
  on public.parent_student_links for select
  using (auth.uid() = parent_id or auth.uid() = student_id);

create policy "Students can create/accept links"
  on public.parent_student_links for insert
  with check (auth.uid() = student_id or auth.uid() = parent_id);

create policy "Parties can update their own links"
  on public.parent_student_links for update
  using (auth.uid() = parent_id or auth.uid() = student_id);

-- 2. Live messaging between a linked parent and student.
create table if not exists public.parent_messages (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references public.parent_student_links(id) on delete cascade,
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
      where l.id = link_id and l.status = 'approved'
        and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.parent_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.parent_student_links l
      where l.id = link_id and l.status = 'approved'
        and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.parent_messages;

-- 3. Routine tests — scheduled tests shown on both the student's routine
--    page and the parent dashboard.
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
      where l.student_id = routine_tests.student_id
        and l.parent_id = auth.uid() and l.status = 'approved'
    )
  );

-- 4. Indian board support — extends the existing board_type enum
--    (Pakistani boards stay unchanged; app already supports both
--    countries via this single enum + grade_level, which already
--    numbers classes the same way India does: Grade 9-12).
alter type board_type add value if not exists 'CBSE';
alter type board_type add value if not exists 'ICSE';
alter type board_type add value if not exists 'STATE_BOARD_IN';
