-- Student-to-student chat with request-first approval.
-- Free users may send/accept requests; actual messaging is gated in the app/API
-- to Pro/Elite so the feature can also work as an upgrade path.

create table if not exists public.student_chat_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_chat_not_self check (requester_id <> recipient_id)
);

create index if not exists idx_student_chat_requests_requester on public.student_chat_requests(requester_id);
create index if not exists idx_student_chat_requests_recipient on public.student_chat_requests(recipient_id);
create index if not exists idx_student_chat_requests_status on public.student_chat_requests(status);

create table if not exists public.student_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.student_chat_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_student_chat_messages_request on public.student_chat_messages(request_id, created_at);

alter table public.student_chat_requests enable row level security;
alter table public.student_chat_messages enable row level security;

drop policy if exists "Students can view their chat requests" on public.student_chat_requests;
create policy "Students can view their chat requests"
  on public.student_chat_requests for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Students can create chat requests" on public.student_chat_requests;
create policy "Students can create chat requests"
  on public.student_chat_requests for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Recipient can update chat request status" on public.student_chat_requests;
create policy "Recipient can update chat request status"
  on public.student_chat_requests for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Approved participants can view messages" on public.student_chat_messages;
create policy "Approved participants can view messages"
  on public.student_chat_messages for select
  using (
    exists (
      select 1 from public.student_chat_requests r
      where r.id = request_id
        and r.status = 'approved'
        and (r.requester_id = auth.uid() or r.recipient_id = auth.uid())
    )
  );

drop policy if exists "Approved participants can send messages" on public.student_chat_messages;
create policy "Approved participants can send messages"
  on public.student_chat_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.student_chat_requests r
      where r.id = request_id
        and r.status = 'approved'
        and (r.requester_id = auth.uid() or r.recipient_id = auth.uid())
    )
  );
