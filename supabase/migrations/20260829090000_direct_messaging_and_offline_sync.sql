-- Phase 1 (foundation) of the multi-phase feature set:
--
-- 1a. Generic 1:1 messaging infrastructure. Deliberately modeled as a conversation between two
--     PROFILES (not "a parent and a student", not "a parent and a teacher") so the same two tables
--     serve every current and future 1:1 relationship this app needs to message across:
--       - parent <-> teacher (school/college communication, Phase 2c)
--       - principal <-> principal (future cross-org messaging, same shape as
--         institution_directory_messages but 1:1 and reusable beyond principals)
--       - student <-> student peer-help (future; NOT used by the Phase 3 doubts board, which stays
--         a public Q&A thread on `doubts`/`doubt_replies`, not a 1:1 DM)
--     The relationship-specific validation (who is allowed to open a conversation with whom) lives
--     in get_or_create_direct_conversation() below, not in the table shape or RLS — adding a new
--     relationship_type later means adding a branch to that function, not a new table.
--
--     Naming note: this app already has a `conversations` table (AI tutor chat history, keyed by
--     user_id + jsonb messages) and a `parent_messages` table (existing parent<->student chat tied
--     to parent_student_links). Both are unrelated, existing features — this migration does not
--     touch them. New tables are named direct_conversations / direct_messages to avoid any confusion
--     with either.
--
-- 1b. Offline sync conflict log. The client-side IndexedDB queue (src/lib/offline/sync-queue.ts)
--     replays queued attendance marks / quiz completions when connectivity returns. Replays are
--     last-write-wins (matching the spec), but when a replayed write disagrees with what's already
--     on the server (e.g. two teachers marked the same student differently while both were offline),
--     the server logs a row here instead of silently dropping the discrepancy, so an admin/teacher
--     can review it.

-- ============================================================================
-- 1a. Generic direct messaging
-- ============================================================================

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  -- 'school' | 'college' | 'consumer' — which access-control domain governs this conversation.
  -- 'consumer' means no institution organization is involved (e.g. a future student-to-student
  -- conversation started outside any school/college context).
  context_type text not null check (context_type in ('school', 'college', 'consumer')),
  organization_id uuid,
  relationship_type text not null check (relationship_type in ('parent_teacher', 'principal_principal', 'peer_help')),
  -- Always stored with participant_one_id < participant_two_id (enforced by
  -- get_or_create_direct_conversation) so the same pair can never produce two rows regardless of
  -- who initiated.
  participant_one_id uuid not null references public.profiles(id) on delete cascade,
  participant_two_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (participant_one_id <> participant_two_id),
  check (context_type = 'consumer' or organization_id is not null),
  unique (context_type, organization_id, relationship_type, participant_one_id, participant_two_id)
);

create index if not exists direct_conversations_participant_one_idx
  on public.direct_conversations (participant_one_id, last_message_at desc);
create index if not exists direct_conversations_participant_two_idx
  on public.direct_conversations (participant_two_id, last_message_at desc);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_conversation_idx
  on public.direct_messages (conversation_id, created_at asc);

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

-- No direct INSERT policy on direct_conversations: rows are only ever created through
-- get_or_create_direct_conversation() (security definer), which is where the relationship-specific
-- authorization checks live. Participants may only SELECT their own conversations.
drop policy if exists "participants read own direct conversations" on public.direct_conversations;
create policy "participants read own direct conversations"
  on public.direct_conversations for select
  using (auth.uid() in (participant_one_id, participant_two_id));

drop policy if exists "participants read own direct messages" on public.direct_messages;
create policy "participants read own direct messages"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.direct_conversations c
      where c.id = direct_messages.conversation_id
        and auth.uid() in (c.participant_one_id, c.participant_two_id)
    )
  );

drop policy if exists "participants send direct messages" on public.direct_messages;
create policy "participants send direct messages"
  on public.direct_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.direct_conversations c
      where c.id = direct_messages.conversation_id
        and auth.uid() in (c.participant_one_id, c.participant_two_id)
    )
  );

-- Recipients mark messages read (never their own — app layer only ever calls this for the other
-- participant's messages, mirroring the parent_messages / student_chat_messages read-receipt style).
drop policy if exists "participants mark direct messages read" on public.direct_messages;
create policy "participants mark direct messages read"
  on public.direct_messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.direct_conversations c
      where c.id = direct_messages.conversation_id
        and auth.uid() in (c.participant_one_id, c.participant_two_id)
    )
  )
  with check (sender_id <> auth.uid());

-- Relationship-specific authorization. Each relationship_type branch below is the one place that
-- knows "who is allowed to message whom" for that relationship — adding a new relationship later
-- (e.g. 'principal_principal') means adding a branch here, the table/RLS above needs no changes.
create or replace function public.get_or_create_direct_conversation(
  p_context_type text,
  p_organization_id uuid,
  p_relationship_type text,
  p_other_profile_id uuid
)
returns public.direct_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_p1 uuid;
  v_p2 uuid;
  v_row public.direct_conversations;
  v_caller_role text;
  v_other_role text;
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;
  if p_other_profile_id is null or p_other_profile_id = v_caller then
    raise exception 'Invalid conversation participant';
  end if;

  if p_relationship_type = 'parent_teacher' then
    if p_context_type not in ('school', 'college') or p_organization_id is null then
      raise exception 'A parent-teacher conversation requires a school or college organization';
    end if;
    if p_context_type = 'school' then
      select member_role into v_caller_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    else
      select member_role into v_caller_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    end if;
    if v_caller_role is null or v_other_role is null then
      raise exception 'Both participants must be active members of this organization';
    end if;
    if not (
      (v_caller_role = 'parent' and v_other_role = 'teacher')
      or (v_caller_role = 'teacher' and v_other_role = 'parent')
    ) then
      raise exception 'A parent-teacher conversation requires one parent and one teacher';
    end if;
  else
    raise exception 'Unsupported relationship type: %', p_relationship_type;
  end if;

  v_p1 := least(v_caller, p_other_profile_id);
  v_p2 := greatest(v_caller, p_other_profile_id);

  insert into public.direct_conversations (context_type, organization_id, relationship_type, participant_one_id, participant_two_id)
  values (p_context_type, p_organization_id, p_relationship_type, v_p1, v_p2)
  on conflict (context_type, organization_id, relationship_type, participant_one_id, participant_two_id)
  do update set context_type = excluded.context_type
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(text, uuid, text, uuid) to authenticated;

create or replace function public.touch_direct_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.direct_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_direct_conversation_last_message on public.direct_messages;
create trigger trg_touch_direct_conversation_last_message
after insert on public.direct_messages
for each row execute function public.touch_direct_conversation_last_message();

-- ============================================================================
-- 1b. Offline sync: conflict log + idempotent quiz replay
-- ============================================================================

-- Lets a queued /api/quiz/complete replay be retried safely (e.g. the client never saw the success
-- response and retries the same queued item) without inserting a duplicate quiz_sessions row and
-- double-awarding XP/coins. Nullable + unique so existing rows and the normal (online, non-queued)
-- completion path are unaffected.
alter table public.quiz_sessions add column if not exists client_idempotency_key text;
create unique index if not exists quiz_sessions_client_idempotency_key_idx
  on public.quiz_sessions (client_idempotency_key) where client_idempotency_key is not null;

create table if not exists public.offline_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('attendance')),
  organization_id uuid not null,
  entity_ref jsonb not null,
  client_payload jsonb not null,
  server_payload jsonb not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz
);

create index if not exists offline_sync_conflicts_org_idx
  on public.offline_sync_conflicts (organization_id, resolved, created_at desc);

alter table public.offline_sync_conflicts enable row level security;

-- Only staff with attendance.manage in the organization may see/resolve conflicts — same
-- membership shape the school-erp access layer already uses, applied directly since this table has
-- no server-side access.ts helper of its own (it's written exclusively by the service-role sync
-- route, never by an authenticated client insert).
drop policy if exists "attendance managers read offline sync conflicts" on public.offline_sync_conflicts;
create policy "attendance managers read offline sync conflicts"
  on public.offline_sync_conflicts for select
  using (
    exists (
      select 1 from public.school_memberships m
      where m.organization_id = offline_sync_conflicts.organization_id
        and m.profile_id = auth.uid()
        and m.status = 'active'
        and ('attendance.manage' = any(m.permissions) or m.member_role in ('owner', 'admin', 'teacher'))
    )
  );

drop policy if exists "attendance managers resolve offline sync conflicts" on public.offline_sync_conflicts;
create policy "attendance managers resolve offline sync conflicts"
  on public.offline_sync_conflicts for update
  using (
    exists (
      select 1 from public.school_memberships m
      where m.organization_id = offline_sync_conflicts.organization_id
        and m.profile_id = auth.uid()
        and m.status = 'active'
        and ('attendance.manage' = any(m.permissions) or m.member_role in ('owner', 'admin', 'teacher'))
    )
  )
  with check (resolved_by = auth.uid());
