-- Add read receipts for student-to-student chat messages.
alter table public.student_chat_messages
  add column if not exists read_at timestamptz;

create index if not exists student_chat_messages_read_at_idx
  on public.student_chat_messages(request_id, sender_id, read_at);
