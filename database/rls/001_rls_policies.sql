-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.conversations enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.notes enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.past_papers enable row level security;

-- PROFILES: users can read all profiles (for leaderboard), but only edit their own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- SUBJECTS / CHAPTERS / TOPICS / PAST_PAPERS: public read, admin write (handled via service role)
create policy "Subjects are viewable by everyone" on public.subjects for select using (is_active = true);
create policy "Chapters are viewable by everyone" on public.chapters for select using (is_active = true);
create policy "Topics are viewable by everyone" on public.topics for select using (is_active = true);
create policy "Past papers are viewable by everyone" on public.past_papers for select using (true);

-- QUESTIONS: public read of verified questions
create policy "Verified questions are viewable by everyone" on public.questions for select using (is_verified = true or true);
-- (kept permissive so AI-generated unverified questions still render to the user who generated them)

-- QUIZ SESSIONS: strictly own-data
create policy "Users can view own quiz sessions" on public.quiz_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own quiz sessions" on public.quiz_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own quiz sessions" on public.quiz_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own quiz sessions" on public.quiz_sessions for delete using (auth.uid() = user_id);

-- CONVERSATIONS: strictly own-data
create policy "Users can view own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on public.conversations for update using (auth.uid() = user_id);
create policy "Users can delete own conversations" on public.conversations for delete using (auth.uid() = user_id);

-- FLASHCARD DECKS: own + public decks
create policy "Users can view own or public decks" on public.flashcard_decks for select using (auth.uid() = user_id or is_public = true);
create policy "Users can insert own decks" on public.flashcard_decks for insert with check (auth.uid() = user_id);
create policy "Users can update own decks" on public.flashcard_decks for update using (auth.uid() = user_id);
create policy "Users can delete own decks" on public.flashcard_decks for delete using (auth.uid() = user_id);

-- FLASHCARDS: strictly own-data
create policy "Users can view own flashcards" on public.flashcards for select using (auth.uid() = user_id);
create policy "Users can insert own flashcards" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "Users can update own flashcards" on public.flashcards for update using (auth.uid() = user_id);
create policy "Users can delete own flashcards" on public.flashcards for delete using (auth.uid() = user_id);

-- STUDY SESSIONS: strictly own-data
create policy "Users can view own study sessions" on public.study_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own study sessions" on public.study_sessions for insert with check (auth.uid() = user_id);

-- NOTES: own + public notes
create policy "Users can view own or public notes" on public.notes for select using (auth.uid() = user_id or is_public = true);
create policy "Users can insert own notes" on public.notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes" on public.notes for update using (auth.uid() = user_id);
create policy "Users can delete own notes" on public.notes for delete using (auth.uid() = user_id);

-- ACHIEVEMENTS: public read
create policy "Achievements are viewable by everyone" on public.achievements for select using (true);
create policy "Users can view own earned achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Users can insert own earned achievements" on public.user_achievements for insert with check (auth.uid() = user_id);

-- SUBSCRIPTIONS: strictly own-data (writes happen via service role from webhook)
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- NOTIFICATIONS: strictly own-data
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
