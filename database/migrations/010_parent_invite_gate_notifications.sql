-- Parent onboarding gate:
-- A parent can generate an invite before any student is linked. The pending
-- row has no student_id until a student accepts the invite code.

alter table public.parent_student_links
  alter column student_id drop not null;

alter table public.parent_student_links
  add column if not exists invite_expires_at timestamptz;

create index if not exists idx_parent_links_invite_active
  on public.parent_student_links(invite_code, status, invite_expires_at);
