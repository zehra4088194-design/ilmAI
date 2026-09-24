alter table public.profiles
  add column if not exists science_group text;

alter table public.profiles
  drop constraint if exists profiles_science_group_check;

alter table public.profiles
  add constraint profiles_science_group_check
  check (science_group is null or science_group in ('biology', 'computer'));

insert into public.games (
  slug,
  title,
  description,
  thumbnail_url,
  category,
  game_type,
  difficulty,
  featured,
  min_tier
)
values (
  'curriculum-quiz-room',
  'Class MCQ Challenge',
  'Answer random questions from your class books and reveal the correct choice together.',
  null,
  'Quiz',
  'curriculum_quiz',
  'medium',
  true,
  'PRO'
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  game_type = excluded.game_type,
  difficulty = excluded.difficulty,
  featured = excluded.featured,
  min_tier = excluded.min_tier;
