-- Live classes for regular subjects (9th/10th/11th/12th etc.), layered on top of
-- the EXISTING teacher_classes/class_enrollments model (20260710121200_teacher_dashboard.sql)
-- — deliberately reusing that table instead of a parallel one, since a teacher's
-- students are already defined there via join_code enrollment.
--
-- PW-style: the teacher broadcasts camera+mic to the whole class; students are
-- VIEW-ONLY (no mic/camera ever leaves a student's device — enforced at the
-- LiveKit token grant level, see src/lib/live-classes/livekit.ts) and instead
-- participate via a shared text chat that both the teacher and every student see
-- live (like a YouTube-Live-style chat, not a private DM to the teacher).

create table if not exists public.class_live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  title text not null,
  status text not null default 'live' check (status in ('live', 'ended')),
  livekit_room_name text not null unique,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_class_live_sessions_class on public.class_live_sessions (class_id, started_at desc);

create table if not exists public.class_live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_live_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('teacher', 'student')),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_class_live_chat_session on public.class_live_chat_messages (session_id, created_at);

-- Simple join/leave log per session — same pattern as quran_attendance.
create table if not exists public.class_live_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (session_id, student_id)
);

alter table public.class_live_sessions enable row level security;
alter table public.class_live_chat_messages enable row level security;
alter table public.class_live_attendance enable row level security;

drop policy if exists "teacher manages own live sessions" on public.class_live_sessions;
create policy "teacher manages own live sessions" on public.class_live_sessions
  for all using (
    exists (select 1 from public.teacher_classes c where c.id = class_live_sessions.class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.teacher_classes c where c.id = class_live_sessions.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "enrolled student reads live sessions" on public.class_live_sessions;
create policy "enrolled student reads live sessions" on public.class_live_sessions
  for select using (
    exists (select 1 from public.class_enrollments e where e.class_id = class_live_sessions.class_id and e.student_id = auth.uid())
  );

drop policy if exists "class members read live chat" on public.class_live_chat_messages;
create policy "class members read live chat" on public.class_live_chat_messages
  for select using (
    exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_chat_messages.session_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.class_live_sessions s
      join public.class_enrollments e on e.class_id = s.class_id
      where s.id = class_live_chat_messages.session_id and e.student_id = auth.uid()
    )
  );

drop policy if exists "teacher sends live chat" on public.class_live_chat_messages;
create policy "teacher sends live chat" on public.class_live_chat_messages
  for insert with check (
    sender_id = auth.uid() and sender_role = 'teacher'
    and exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_chat_messages.session_id and c.teacher_id = auth.uid() and s.status = 'live'
    )
  );

drop policy if exists "student sends live chat" on public.class_live_chat_messages;
create policy "student sends live chat" on public.class_live_chat_messages
  for insert with check (
    sender_id = auth.uid() and sender_role = 'student'
    and exists (
      select 1 from public.class_live_sessions s
      join public.class_enrollments e on e.class_id = s.class_id
      where s.id = class_live_chat_messages.session_id and e.student_id = auth.uid() and s.status = 'live'
    )
  );

drop policy if exists "teacher reads own session attendance" on public.class_live_attendance;
create policy "teacher reads own session attendance" on public.class_live_attendance
  for select using (
    exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_attendance.session_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "student manages own live attendance" on public.class_live_attendance;
create policy "student manages own live attendance" on public.class_live_attendance
  for all using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.class_live_sessions s
      join public.class_enrollments e on e.class_id = s.class_id
      where s.id = class_live_attendance.session_id and e.student_id = auth.uid()
    )
  );

-- Live chat + session status need to reach connected clients instantly (chat
-- scroll, and the student-side "class has ended" auto-redirect).
alter table public.class_live_chat_messages replica identity full;
alter table public.class_live_sessions replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'class_live_chat_messages'
    ) then
    alter publication supabase_realtime add table public.class_live_chat_messages;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'class_live_sessions'
    ) then
    alter publication supabase_realtime add table public.class_live_sessions;
  end if;
end $$;
