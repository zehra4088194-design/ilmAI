create table if not exists public.boss_quizzes (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid references public.subjects(id),
  week_start_date date not null,
  quiz_session_template jsonb not null,
  xp_reward integer not null default 100,
  coin_reward integer not null default 50,
  created_at timestamptz not null default now(),
  unique(subject_id, week_start_date)
);

create table if not exists public.boss_quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  boss_quiz_id uuid not null references public.boss_quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_session_id uuid references public.quiz_sessions(id),
  score numeric,
  completed_at timestamptz,
  unique(boss_quiz_id, user_id)
);

create table if not exists public.avatar_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slot text not null check (slot in ('base','hair','outfit','accessory','background')),
  svg_asset_url text not null,
  coin_price integer not null default 0,
  is_default boolean not null default false
);

create table if not exists public.student_avatar_inventory (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.avatar_items(id) on delete cascade,
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique(student_id, item_id)
);

alter table public.boss_quizzes enable row level security;
alter table public.boss_quiz_attempts enable row level security;
alter table public.avatar_items enable row level security;
alter table public.student_avatar_inventory enable row level security;

drop policy if exists "public read boss quizzes" on public.boss_quizzes;
create policy "public read boss quizzes" on public.boss_quizzes for select using (true);

drop policy if exists "user manages own attempts" on public.boss_quiz_attempts;
create policy "user manages own attempts" on public.boss_quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public read avatar catalog" on public.avatar_items;
create policy "public read avatar catalog" on public.avatar_items for select using (true);

drop policy if exists "user manages own inventory" on public.student_avatar_inventory;
create policy "user manages own inventory" on public.student_avatar_inventory
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

insert into public.avatar_items (name, slot, svg_asset_url, coin_price, is_default)
values
  ('Default Base', 'base', '/avatar/placeholders/base.svg', 0, true),
  ('Warm Base', 'base', '/avatar/placeholders/base-warm.svg', 0, true),
  ('Classic Hair', 'hair', '/avatar/placeholders/hair-classic.svg', 0, true),
  ('Scholar Hair', 'hair', '/avatar/placeholders/hair-scholar.svg', 0, true),
  ('Study Hoodie', 'outfit', '/avatar/placeholders/outfit-hoodie.svg', 0, true),
  ('Exam Blazer', 'outfit', '/avatar/placeholders/outfit-blazer.svg', 0, true),
  ('Focus Glasses', 'accessory', '/avatar/placeholders/accessory-glasses.svg', 0, true),
  ('Calm Background', 'background', '/avatar/placeholders/background-calm.svg', 0, true),
  ('Gold Aura', 'background', '/avatar/placeholders/background-gold.svg', 80, false),
  ('Champion Crown', 'accessory', '/avatar/placeholders/accessory-crown.svg', 120, false)
on conflict do nothing;

create index if not exists idx_boss_attempts_user_completed
  on public.boss_quiz_attempts(user_id, completed_at desc);
