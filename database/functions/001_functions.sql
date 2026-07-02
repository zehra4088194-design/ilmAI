-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Get leaderboard with rank
create or replace function public.get_leaderboard(p_limit int default 50, p_offset int default 0)
returns table (rank bigint, id uuid, full_name text, avatar_url text, board board_type, xp int, level int, streak int)
language sql stable as $$
  select row_number() over (order by xp desc) as rank, id, full_name, avatar_url, board, xp, level, streak
  from public.profiles
  order by xp desc
  limit p_limit offset p_offset;
$$;

-- SM-2 spaced repetition algorithm for flashcards
-- quality: 0-5 (0 = total blackout, 5 = perfect response)
create or replace function public.calculate_next_review(p_quality int, p_interval int, p_ease_factor numeric)
returns jsonb language plpgsql as $$
declare
  new_ease_factor numeric;
  new_interval int;
  new_repetitions int;
begin
  new_ease_factor := greatest(1.3, p_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02)));

  if p_quality < 3 then
    new_interval := 1;
    new_repetitions := 0;
  else
    if p_interval = 1 then new_interval := 6;
    else new_interval := round(p_interval * new_ease_factor);
    end if;
    new_repetitions := 1;
  end if;

  return jsonb_build_object(
    'interval', new_interval,
    'ease_factor', new_ease_factor,
    'repetitions', new_repetitions,
    'next_review_at', (now() + (new_interval || ' days')::interval)
  );
end;
$$;

-- Update XP and auto-calculate level (1000 XP per level)
create or replace function public.add_xp(p_user_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set xp = xp + p_amount,
      level = floor((xp + p_amount) / 1000.0) + 1
  where id = p_user_id;
end;
$$;

-- Update daily streak (call once per day on first activity)
create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_last_active date;
begin
  select last_active_date into v_last_active from public.profiles where id = p_user_id;

  if v_last_active = current_date then
    return; -- already counted today
  elsif v_last_active = current_date - interval '1 day' then
    update public.profiles set streak = streak + 1, last_active_date = current_date where id = p_user_id;
  else
    update public.profiles set streak = 1, last_active_date = current_date where id = p_user_id;
  end if;
end;
$$;

-- Recalculate subject question/chapter counts (run after bulk imports)
create or replace function public.refresh_subject_counts()
returns void language plpgsql as $$
begin
  update public.subjects s set
    total_chapters = (select count(*) from public.chapters c where c.subject_id = s.id),
    total_questions = (select count(*) from public.questions q where q.subject_id = s.id);

  update public.chapters c set
    total_topics = (select count(*) from public.topics t where t.chapter_id = c.id),
    total_questions = (select count(*) from public.questions q where q.chapter_id = c.id);
end;
$$;
