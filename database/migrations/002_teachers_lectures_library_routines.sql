-- ============================================
-- MIGRATION 002: Teachers/AI-persona, Doubt Board, Lectures,
-- Library (Google Drive books), Study Routines
-- ============================================

-- ---------- ROLES + AI-OPERATED ACCOUNTS ----------

alter table public.profiles add column if not exists role user_role not null default 'student';
alter table public.profiles add column if not exists is_ai_operated boolean not null default false;
alter table public.profiles add column if not exists ai_persona_provider text; -- 'groq' | 'claude' | 'gpt' | 'gemini', null if not AI-operated
alter table public.profiles add column if not exists ai_persona_tier text default 'medium';
create index if not exists idx_profiles_role on public.profiles(role);

-- ---------- DOUBT BOARD ("Ask a Teacher") ----------
-- Students post a question; a Teacher account (human or AI-operated, indistinguishable
-- in the UI) replies. Admin decides per-teacher whether replies are AI-generated.
create table public.doubts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  body text not null,
  image_url text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_doubts_student on public.doubts(student_id);
create index idx_doubts_subject on public.doubts(subject_id);

create table public.doubt_replies (
  id uuid primary key default uuid_generate_v4(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_doubt_replies_doubt on public.doubt_replies(doubt_id);

-- ---------- LECTURES (YouTube links per chapter/topic, including math exercises) ----------
create table public.lectures (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  youtube_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  kind text not null default 'lecture', -- 'lecture' | 'exercise_walkthrough'
  exercise_number text, -- e.g. "Exercise 5.2" — only used when kind = 'exercise_walkthrough'
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_lectures_chapter on public.lectures(chapter_id);

-- ---------- LIBRARY (Google Drive book/notes links — local + international) ----------
create table public.library_resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text not null default 'local', -- 'local' | 'international'
  subject_id uuid references public.subjects(id) on delete set null,
  board board_type,
  grade_level grade_level,
  drive_url text not null,      -- shareable Google Drive link
  drive_file_id text,           -- optional, used to build a preview thumbnail
  thumbnail_url text,
  file_type text default 'pdf', -- 'pdf' | 'docx' | 'pptx' | 'other'
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_library_category on public.library_resources(category);
create index idx_library_subject on public.library_resources(subject_id);

-- ---------- STUDY ROUTINES (AI-generated personalized schedule) ----------
create table public.study_routines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  preferences jsonb not null default '{}',  -- raw answers from the AI questionnaire
  schedule jsonb not null default '[]',     -- generated weekly timetable
  generated_by_provider text default 'groq',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_study_routines_updated_at before update on public.study_routines for each row execute function public.set_updated_at();

-- ---------- RLS for new tables ----------
alter table public.doubts enable row level security;
alter table public.doubt_replies enable row level security;
alter table public.lectures enable row level security;
alter table public.library_resources enable row level security;
alter table public.study_routines enable row level security;

create policy "Doubts are viewable by everyone" on public.doubts for select using (true);
create policy "Students can post own doubts" on public.doubts for insert with check (auth.uid() = student_id);
create policy "Students can update own doubts" on public.doubts for update using (auth.uid() = student_id);

create policy "Doubt replies are viewable by everyone" on public.doubt_replies for select using (true);
create policy "Teachers can reply to doubts" on public.doubt_replies for insert with check (
  auth.uid() = teacher_id and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
);

create policy "Lectures are viewable by everyone" on public.lectures for select using (true);
create policy "Library resources are viewable by everyone" on public.library_resources for select using (true);

create policy "Users can view own study routine" on public.study_routines for select using (auth.uid() = user_id);
create policy "Users can insert own study routine" on public.study_routines for insert with check (auth.uid() = user_id);
create policy "Users can update own study routine" on public.study_routines for update using (auth.uid() = user_id);

-- ============================================
-- PARENT DASHBOARD TABLES
-- ============================================

-- Parent-Student link table (one parent can link multiple students)
create table public.parent_student_links (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  invite_code text unique,                -- student enters this to accept the link
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);
create index idx_parent_links_parent on public.parent_student_links(parent_id);
create index idx_parent_links_student on public.parent_student_links(student_id);
create index idx_parent_links_code on public.parent_student_links(invite_code);

-- Weekly progress snapshots (so parents can see trends without scanning live data)
create table public.student_weekly_snapshots (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  xp_earned integer not null default 0,
  quizzes_completed integer not null default 0,
  average_score numeric(5,2) not null default 0,
  study_minutes integer not null default 0,
  streak_days integer not null default 0,
  subjects_studied text[] default '{}',
  ai_messages_sent integer not null default 0,
  created_at timestamptz not null default now(),
  unique(student_id, week_start)
);
create index idx_snapshots_student on public.student_weekly_snapshots(student_id, week_start desc);

-- RLS for parent tables
alter table public.parent_student_links enable row level security;
alter table public.student_weekly_snapshots enable row level security;

create policy "Parents can view own links" on public.parent_student_links for select using (auth.uid() = parent_id);
create policy "Parents can insert own links" on public.parent_student_links for insert with check (auth.uid() = parent_id);
create policy "Students can view links where they're the student" on public.parent_student_links for select using (auth.uid() = student_id);
create policy "Students can update their own pending links" on public.parent_student_links for update using (auth.uid() = student_id);
create policy "Students can view own snapshots" on public.student_weekly_snapshots for select using (auth.uid() = student_id);
create policy "Parents can view linked student snapshots" on public.student_weekly_snapshots for select using (
  exists (select 1 from public.parent_student_links where parent_id = auth.uid() and student_id = student_weekly_snapshots.student_id and status = 'approved')
);
