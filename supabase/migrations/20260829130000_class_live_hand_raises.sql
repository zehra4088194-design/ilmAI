-- "Raise hand" for Live Classes (see 20260829120000_class_live_sessions.sql).
-- Students are view-only broadcast participants by default; this lets a
-- student ask to speak, and the teacher grant/revoke their microphone live —
-- without reissuing a LiveKit token (RoomServiceClient.updateParticipant can
-- change a connected participant's publish permission on the fly).

create table if not exists public.class_live_hand_raises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'raised' check (status in ('raised', 'granted', 'lowered')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index if not exists idx_class_live_hand_raises_session on public.class_live_hand_raises (session_id, status);

alter table public.class_live_hand_raises enable row level security;

drop policy if exists "class members read hand raises" on public.class_live_hand_raises;
create policy "class members read hand raises" on public.class_live_hand_raises
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_hand_raises.session_id and c.teacher_id = auth.uid()
    )
  );

-- Student raises/lowers their own hand.
drop policy if exists "student raises own hand" on public.class_live_hand_raises;
create policy "student raises own hand" on public.class_live_hand_raises
  for insert with check (
    student_id = auth.uid() and status = 'raised'
    and exists (
      select 1 from public.class_live_sessions s
      join public.class_enrollments e on e.class_id = s.class_id
      where s.id = class_live_hand_raises.session_id and e.student_id = auth.uid() and s.status = 'live'
    )
  );

-- Either the student (lowering their own hand) or the class's teacher (granting/revoking) can update a row.
drop policy if exists "hand raise status update" on public.class_live_hand_raises;
create policy "hand raise status update" on public.class_live_hand_raises
  for update using (
    student_id = auth.uid()
    or exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_hand_raises.session_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    student_id = auth.uid()
    or exists (
      select 1 from public.class_live_sessions s
      join public.teacher_classes c on c.id = s.class_id
      where s.id = class_live_hand_raises.session_id and c.teacher_id = auth.uid()
    )
  );

alter table public.class_live_hand_raises replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'class_live_hand_raises'
    ) then
    alter publication supabase_realtime add table public.class_live_hand_raises;
  end if;
end $$;
