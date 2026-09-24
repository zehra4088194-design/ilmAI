-- Student privacy, protected resource context, and realtime parent linking.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parent-attachments',
  'parent-attachments',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles
  add column if not exists gender text,
  add column if not exists gender_changed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gender_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('girl', 'boy'));
  end if;
end $$;

create or replace function public.enforce_profile_gender_cooldown()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.gender is distinct from new.gender then
    if old.gender is not null
      and old.gender_changed_at is not null
      and old.gender_changed_at > now() - interval '7 days' then
      raise exception 'Gender can only be changed once every 7 days.';
    end if;
    new.gender_changed_at := now();
  else
    new.gender_changed_at := old.gender_changed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_gender_cooldown on public.profiles;
create trigger profiles_gender_cooldown
before update of gender, gender_changed_at on public.profiles
for each row execute function public.enforce_profile_gender_cooldown();

create index if not exists profiles_gender_idx on public.profiles (gender) where role = 'student';

create or replace function public.enforce_student_chat_same_gender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_gender text;
  recipient_gender text;
begin
  select gender into requester_gender from public.profiles where id = new.requester_id;
  select gender into recipient_gender from public.profiles where id = new.recipient_id;
  if requester_gender is null or recipient_gender is null then
    raise exception 'Both students must select gender before using Study Buddies.';
  end if;
  if requester_gender <> recipient_gender then
    raise exception 'Study Buddies chat is limited to students of the same gender.';
  end if;
  return new;
end;
$$;

drop trigger if exists student_chat_same_gender on public.student_chat_requests;
create trigger student_chat_same_gender
before insert or update of requester_id, recipient_id, status on public.student_chat_requests
for each row execute function public.enforce_student_chat_same_gender();

alter table public.library_resources
  add column if not exists context_text_url text;

alter table public.past_papers
  add column if not exists context_text_url text;

alter table public.college_resources
  add column if not exists context_text_url text;

-- Students can query resource metadata, but source PDF/TXT locations remain
-- service-role-only. Files are served through authenticated app endpoints.
revoke select on table public.library_resources from anon, authenticated;
grant select (
  id, title, description, category, resource_type, subject_id, chapter_id,
  board, grade_level, file_type, created_at
) on table public.library_resources to authenticated;

revoke select on table public.past_papers from anon, authenticated;
grant select (
  id, subject_id, chapter_id, board, grade_level, year, paper_type,
  total_questions, duration, is_verified, download_count, created_at
) on table public.past_papers to authenticated;

revoke select on table public.college_resources from anon, authenticated;
grant select (
  id, college_id, title, resource_type, stream, degree_name, course_name,
  semester, chapter_title, created_at
) on table public.college_resources to authenticated;

alter table public.parent_student_links replica identity full;
alter table public.student_chat_requests replica identity full;
alter table public.parent_attachments replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'parent_student_links'
    ) then
      alter publication supabase_realtime add table public.parent_student_links;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_chat_requests'
    ) then
      alter publication supabase_realtime add table public.student_chat_requests;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'parent_attachments'
    ) then
      alter publication supabase_realtime add table public.parent_attachments;
    end if;
  end if;
end $$;
