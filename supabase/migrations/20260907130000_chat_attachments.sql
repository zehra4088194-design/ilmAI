-- Adds a single optional file attachment per message across all three 1:1 chat surfaces
-- (Study Buddies, parent<->student, parent<->teacher/principal). attachment_url follows the same
-- r2://<bucket>/<key> convention parent_attachments.file_url already uses, so getR2Uri/parseR2Uri
-- work unchanged — files live in the new, private, dedicated CHAT_STORAGE_* B2 bucket (see
-- src/lib/storage/r2.ts's getChatConfig), never a public URL.

alter table public.student_chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size_kb integer;

alter table public.student_chat_messages drop constraint if exists student_chat_messages_content_check;
alter table public.student_chat_messages add constraint student_chat_messages_content_check
  check (char_length(content) <= 1000 and (char_length(content) >= 1 or attachment_url is not null));

alter table public.direct_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size_kb integer;

alter table public.direct_messages drop constraint if exists direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check
  check (char_length(content) <= 4000 and (char_length(content) >= 1 or attachment_url is not null));

alter table public.parent_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size_kb integer;
