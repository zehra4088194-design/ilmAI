-- ============================================
-- MIGRATION 006: AI Answer Feedback ("was this helpful" thumbs up/down)
-- Generic table shared by every surface that shows a longer AI-generated
-- answer: Doubt Board replies, AI Tutor chat messages, quiz explanations,
-- full-test written-answer feedback, routine/guess-paper explanations.
-- The floating site-wide quick-chat widget intentionally does not use this.
-- ============================================

create table if not exists public.ai_answer_feedback (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null, -- 'doubt_reply' | 'ai_tutor_message' | 'quiz_explanation' | 'full_test_feedback' | 'routine_explanation' | 'guess_paper_explanation'
  source_id text not null,   -- id of the doubt_reply / message / question / etc. this feedback is about
  is_helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index if not exists idx_ai_answer_feedback_source on public.ai_answer_feedback(source_type, source_id);

alter table public.ai_answer_feedback enable row level security;

create policy "Users manage their own AI feedback"
  on public.ai_answer_feedback for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
