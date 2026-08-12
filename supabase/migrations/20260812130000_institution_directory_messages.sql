-- Principal-to-principal cross-institution directory messaging (owner request, added to Phase 3
-- scope): a principal searches any other school/college by name, optionally narrows to a specific
-- campus, and sends a direct in-app message to that institution's leadership.
--
-- Deliberately one shared table rather than school_* and college_* variants — per the master
-- prompt's own allowance for backend-only plumbing (institution_plan_inquiries is the precedent).
-- The user-facing side (search UI, inbox) still renders per-portal, so the "separate portals"
-- requirement is unaffected; only the message store itself is shared, since a school principal must
-- be able to message a college principal and vice versa, which a split-table design can't do without
-- either a shared parent or duplicating every row.
--
-- organization_id here is NOT a foreign key (school_organizations and college_organizations are
-- different tables) — validity/authorization is enforced entirely through
-- is_institution_principal(), not referential integrity, mirroring how the rest of this codebase
-- already treats cross-tenant-type references (institution_plan_tiers.institution_type).

create or replace function public.is_institution_principal(p_institution_type text, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_institution_type
    when 'school' then public.school_has_role(p_organization_id, array['owner','admin'])
    when 'college' then public.college_has_role(p_organization_id, array['owner','admin'])
    else false
  end
$$;

create table if not exists public.institution_directory_messages (
  id uuid primary key default gen_random_uuid(),
  sender_institution_type text not null check (sender_institution_type in ('school', 'college')),
  sender_organization_id uuid not null,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_institution_type text not null check (recipient_institution_type in ('school', 'college')),
  recipient_organization_id uuid not null,
  recipient_campus_id uuid,
  subject text not null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'read', 'replied')),
  read_by uuid references public.profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(subject) between 1 and 200),
  check (char_length(body) between 1 and 4000)
);

create index if not exists institution_directory_messages_recipient_idx
  on public.institution_directory_messages (recipient_institution_type, recipient_organization_id, created_at desc);
create index if not exists institution_directory_messages_sender_idx
  on public.institution_directory_messages (sender_institution_type, sender_organization_id, created_at desc);

alter table public.institution_directory_messages enable row level security;

drop policy if exists "principals send directory messages" on public.institution_directory_messages;
create policy "principals send directory messages"
  on public.institution_directory_messages for insert
  with check (
    sender_profile_id = auth.uid()
    and public.is_institution_principal(sender_institution_type, sender_organization_id)
    -- the recipient organization must be real and not the sender's own — checked at the app layer
    -- (search results only ever list other institutions), RLS here only guards the sender side
  );

drop policy if exists "principals read own institution directory messages" on public.institution_directory_messages;
create policy "principals read own institution directory messages"
  on public.institution_directory_messages for select
  using (
    sender_profile_id = auth.uid()
    or public.is_institution_principal(sender_institution_type, sender_organization_id)
    or public.is_institution_principal(recipient_institution_type, recipient_organization_id)
  );

drop policy if exists "principals mark directory messages read" on public.institution_directory_messages;
create policy "principals mark directory messages read"
  on public.institution_directory_messages for update
  using (public.is_institution_principal(recipient_institution_type, recipient_organization_id))
  with check (public.is_institution_principal(recipient_institution_type, recipient_organization_id));

-- Notifies every owner/admin of the recipient institution via the existing generic notification
-- center, same delivery mechanism as school_notify_attendance / college's equivalents.
create or replace function public.notify_institution_directory_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.recipient_institution_type = 'school' then
    insert into public.notifications (user_id, type, title, message, link)
    select m.profile_id, 'SYSTEM', 'New message: ' || new.subject,
      left(new.body, 200), '/school-admin/communication'
    from public.school_memberships m
    where m.organization_id = new.recipient_organization_id
      and m.status = 'active'
      and m.member_role in ('owner', 'admin')
      and (new.recipient_campus_id is null or m.campus_id is null or m.campus_id = new.recipient_campus_id);
  elsif new.recipient_institution_type = 'college' then
    insert into public.notifications (user_id, type, title, message, link)
    select m.profile_id, 'SYSTEM', 'New message: ' || new.subject,
      left(new.body, 200), '/college-admin/communication'
    from public.college_memberships m
    where m.organization_id = new.recipient_organization_id
      and m.status = 'active'
      and m.member_role in ('owner', 'admin')
      and (new.recipient_campus_id is null or m.campus_id is null or m.campus_id = new.recipient_campus_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_institution_directory_message on public.institution_directory_messages;
create trigger trg_notify_institution_directory_message
after insert on public.institution_directory_messages
for each row execute function public.notify_institution_directory_message();
