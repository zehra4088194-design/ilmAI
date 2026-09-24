-- User-generated transient data is retained for 48 hours.
-- Library resources, books, past papers, notes, academic progress, and
-- institution content are intentionally not part of this retention policy.
create index if not exists conversations_updated_at_idx on public.conversations (updated_at);
create index if not exists student_chat_messages_created_at_idx on public.student_chat_messages (created_at);
create index if not exists parent_messages_created_at_idx on public.parent_messages (created_at);
create index if not exists notifications_created_at_idx on public.notifications (created_at);
create index if not exists vision_scans_created_at_idx on public.vision_scans (created_at);
create index if not exists speaking_practice_sessions_created_at_idx on public.speaking_practice_sessions (created_at);
create index if not exists parent_attachments_created_at_idx on public.parent_attachments (created_at);
