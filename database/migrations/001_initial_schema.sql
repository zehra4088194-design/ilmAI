-- ============================================
-- STUDYVERSE AI - INITIAL SCHEMA
-- ============================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================
create type board_type as enum ('FBISE', 'BISE_LHR', 'BISE_KHI', 'BISE_RWP', 'BISE_FSD', 'AKU', 'OTHER');
create type grade_level as enum ('GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12', 'O_LEVEL', 'A_LEVEL');
create type subscription_tier as enum ('FREE', 'PRO', 'ELITE');
create type question_type as enum ('MCQ', 'SHORT', 'LONG', 'FILL_BLANK', 'TRUE_FALSE');
create type difficulty_level as enum ('EASY', 'MEDIUM', 'HARD', 'EXPERT');
create type session_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');
create type quiz_mode as enum ('PRACTICE', 'TEST', 'REVIEW', 'EXAM');
create type session_type as enum ('READING', 'QUIZ', 'FLASHCARD', 'AI_CHAT', 'PAST_PAPER');
create type notification_type as enum ('ACHIEVEMENT', 'STREAK', 'REMINDER', 'SYSTEM', 'SOCIAL');
create type paper_type as enum ('ANNUAL', 'SUPPLEMENTARY', 'MODEL');

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  board board_type,
  grade_level grade_level,
  subjects text[] default '{}',
  phone text,
  bio text,
  location text,
  subscription_tier subscription_tier not null default 'FREE',
  subscription_expires_at timestamptz,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_date date default current_date,
  total_study_time integer not null default 0,
  is_email_verified boolean not null default false,
  is_profile_complete boolean not null default false,
  onboarding_step integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_subscription on public.profiles(subscription_tier);
create index idx_profiles_xp on public.profiles(xp desc);

-- ============================================
-- SUBJECTS / CHAPTERS / TOPICS
-- ============================================
create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  code text not null,
  description text,
  icon_url text,
  color text not null default '#7c3aed',
  boards board_type[] not null default '{}',
  grade_levels grade_level[] not null default '{}',
  is_active boolean not null default true,
  total_chapters integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_subjects_slug on public.subjects(slug);

create table public.chapters (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  total_topics integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default now(),
  unique(subject_id, slug)
);
create index idx_chapters_subject on public.chapters(subject_id);

create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  slug text not null,
  content text,
  video_url text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(chapter_id, slug)
);
create index idx_topics_chapter on public.topics(chapter_id);

-- ============================================
-- QUESTIONS
-- ============================================
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.topics(id) on delete set null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  type question_type not null default 'MCQ',
  difficulty difficulty_level not null default 'MEDIUM',
  text text not null,
  options jsonb,
  correct_answer jsonb not null,
  explanation text,
  marks integer not null default 1,
  year integer,
  board board_type,
  tags text[] default '{}',
  is_verified boolean not null default false,
  times_attempted integer not null default 0,
  correct_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_questions_subject on public.questions(subject_id);
create index idx_questions_chapter on public.questions(chapter_id);
create index idx_questions_type on public.questions(type);
create index idx_questions_text_trgm on public.questions using gin(text gin_trgm_ops);

-- ============================================
-- QUIZ SESSIONS
-- ============================================
create table public.quiz_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  chapter_ids uuid[] default '{}',
  questions jsonb not null default '[]',
  current_index integer not null default 0,
  answers jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  time_limit integer,
  time_spent integer not null default 0,
  status session_status not null default 'IN_PROGRESS',
  score numeric(5,2),
  total_marks integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  skipped_count integer not null default 0,
  mode quiz_mode not null default 'PRACTICE'
);
create index idx_quiz_sessions_user on public.quiz_sessions(user_id);
create index idx_quiz_sessions_status on public.quiz_sessions(status);

-- ============================================
-- AI CONVERSATIONS
-- ============================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  subject_id uuid references public.subjects(id) on delete set null,
  messages jsonb not null default '[]',
  total_messages integer not null default 0,
  provider text not null default 'groq',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_conversations_user on public.conversations(user_id);

-- ============================================
-- FLASHCARDS
-- ============================================
create table public.flashcard_decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  cover_color text not null default '#7c3aed',
  is_public boolean not null default false,
  total_cards integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_decks_user on public.flashcard_decks(user_id);

create table public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  hint text,
  tags text[] default '{}',
  difficulty difficulty_level not null default 'MEDIUM',
  next_review_at timestamptz not null default now(),
  interval integer not null default 1,
  ease_factor numeric(4,2) not null default 2.5,
  repetitions integer not null default 0,
  is_starred boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_flashcards_deck on public.flashcards(deck_id);
create index idx_flashcards_review on public.flashcards(user_id, next_review_at);

-- ============================================
-- STUDY SESSIONS (for progress tracking)
-- ============================================
create table public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  type session_type not null,
  duration integer not null default 0,
  xp_earned integer not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);
create index idx_study_sessions_user_date on public.study_sessions(user_id, date desc);

-- ============================================
-- NOTES
-- ============================================
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled Note',
  content text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  tags text[] default '{}',
  is_starred boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notes_user on public.notes(user_id);

-- ============================================
-- ACHIEVEMENTS / GAMIFICATION
-- ============================================
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  icon_url text not null default '🏆',
  xp_reward integer not null default 0,
  condition_type text not null,
  condition_value integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);
create index idx_user_achievements_user on public.user_achievements(user_id);

-- ============================================
-- SUBSCRIPTIONS (Stripe sync)
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier subscription_tier not null default 'FREE',
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  icon_url text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on public.notifications(user_id, is_read);

-- ============================================
-- PAST PAPERS
-- ============================================
create table public.past_papers (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  board board_type not null,
  year integer not null,
  paper_type paper_type not null default 'ANNUAL',
  file_url text not null,
  thumbnail_url text,
  total_questions integer not null default 0,
  duration integer not null default 180,
  is_verified boolean not null default false,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_past_papers_subject on public.past_papers(subject_id);
create index idx_past_papers_board_year on public.past_papers(board, year desc);

-- ============================================
-- UPDATED_AT TRIGGER (generic)
-- ============================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger trg_decks_updated_at before update on public.flashcard_decks for each row execute function public.set_updated_at();
create trigger trg_notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, is_email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Add parent role (append at end of file after initial schema)
-- Note: If running this after initial migration, run just this ALTER:
-- ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';
